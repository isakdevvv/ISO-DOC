import { PrismaClient, RuleSetScope } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Seeding default Tenant and Project...');

    // Create Tenant
    const tenant = await prisma.tenant.upsert({
        where: { slug: 'default-tenant' },
        update: {},
        create: {
            name: 'Default Tenant',
            slug: 'default-tenant',
        },
    });
    console.log(`Tenant created: ${tenant.id}`);

    // Create Project
    const project = await prisma.project.upsert({
        where: { externalId: 'default-project' },
        update: {},
        create: {
            name: 'Default Project',
            externalId: 'default-project',
            tenantId: tenant.id,
        },
    });
    console.log(`Project created: ${project.id}`);

    await seedRuleSets(tenant.id);
}

async function seedRuleSets(tenantId: string) {
    console.log('Ensuring baseline rule sets exist...');

    const globalRuleSet = await prisma.ruleSet.findFirst({
        where: { code: 'GLOBAL_EU_CORE', version: '1.0.0', tenantId: null, projectId: null },
    });

    if (!globalRuleSet) {
        await prisma.ruleSet.create({
            data: {
                code: 'GLOBAL_EU_CORE',
                title: 'EU/TEK17 baseline',
                description: 'Global rules reflecting TEK17 + EU safety obligations',
                scope: RuleSetScope.GLOBAL,
                version: '1.0.0',
                metadata: { source: 'docs/termoteam_blueprint/rules/library.md' },
                rules: {
                    create: [
                        {
                            code: 'REQ_FDV_PSVALUE',
                            description: 'FDV-documentation required for CO₂ systems above PS 250 barg',
                            severity: 'HIGH',
                            condition: {
                                all: [
                                    { fact: 'medium', operator: 'eq', value: 'CO2' },
                                    { fact: 'psValue', operator: 'gte', value: 250 },
                                ],
                            },
                            outcome: {
                                type: 'REQUIRED_DOCUMENT',
                                templateCode: 'FDV_CORE',
                                title: 'FDV – CO₂ anlegg',
                                conflictKey: 'FDV_CORE',
                                message: 'Generer FDV før prosjekt leveres.',
                            },
                            metadata: { category: 'DOCUMENT' },
                            sources: {
                                create: [
                                    {
                                        title: 'TEK17 § 15-1',
                                        reference: 'TEK17 kapittel 15',
                                        url: 'https://dibk.no/regelverk/byggteknisk-forskrift-tek17/15/15-1/',
                                    },
                                ],
                            },
                        },
                        {
                            code: 'REQ_CE_PED',
                            description: 'CE/PED documentation required when PS·V exceeds 25 bar·L',
                            severity: 'HIGH',
                            condition: {
                                all: [
                                    { fact: 'medium', operator: 'eq', value: 'CO2' },
                                    {
                                        all: [
                                            {
                                                fact: 'psValue',
                                                operator: 'gte',
                                                value: 10,
                                            },
                                            {
                                                fact: 'volume',
                                                operator: 'gte',
                                                value: 2.5,
                                            },
                                        ],
                                    },
                                ],
                            },
                            outcome: {
                                type: 'TASK',
                                taskType: 'GENERATE_CE_PED',
                                title: 'Generer CE/PED dokumenter',
                                conflictKey: 'CE_PED',
                            },
                            metadata: { category: 'TASK' },
                            sources: {
                                create: [
                                    {
                                        title: 'PED Annex I',
                                        reference: 'Directive 2014/68/EU',
                                        url: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32014L0068',
                                    },
                                ],
                            },
                        },
                        {
                            code: 'REQ_RISK_ASSESSMENT',
                            description: 'Risk assessment note required for any medium stored indoors',
                            severity: 'MEDIUM',
                            condition: {
                                all: [
                                    { fact: 'medium', operator: 'exists' },
                                    { fact: 'installationType', operator: 'eq', value: 'INDOOR' },
                                ],
                            },
                            outcome: {
                                type: 'FLAG',
                                level: 'WARNING',
                                message: 'Dokumenter vurdering av lekkasjer og nødprosedyrer.',
                                conflictKey: 'RISK_NOTE',
                            },
                            metadata: { category: 'FLAG' },
                            sources: {
                                create: [
                                    {
                                        title: 'Arbeidstilsynet Retningslinje 444',
                                        reference: 'AT-444',
                                    },
                                ],
                            },
                        },
                    ],
                },
            },
        });
        console.log('Seeded global EU/TEK17 rule set');
    } else {
        console.log('Global rule set already present, skipping');
    }

    const tenantRuleSet = await prisma.ruleSet.findFirst({
        where: { code: 'TENANT_CO2_CORE', version: '1.0.0', tenantId },
    });

    if (!tenantRuleSet) {
        await prisma.ruleSet.create({
            data: {
                code: 'TENANT_CO2_CORE',
                title: 'TermoTeam standardkrav',
                description: 'Tenant specific fields and overrides collected during discovery',
                scope: RuleSetScope.TENANT,
                version: '1.0.0',
                tenantId,
                metadata: { owner: 'TermoTeam Ops' },
                rules: {
                    create: [
                        {
                            code: 'REQ_CUSTOMER_CONTACT',
                            description: 'FDV må inneholde kundens kontaktinfo',
                            severity: 'MEDIUM',
                            condition: {
                                fact: 'clientName',
                                operator: 'exists',
                            },
                            outcome: {
                                type: 'REQUIRED_FIELD',
                                templateCode: 'FDV_CORE',
                                path: 'fdv.customer_contact',
                                description: 'Navn, telefon og e-post til ansvarlig hos kunden',
                                conflictKey: 'FDV_CORE',
                            },
                            metadata: { category: 'FIELD' },
                            sources: {
                                create: [
                                    {
                                        title: 'TermoTeam FDV sjekkliste',
                                    },
                                ],
                            },
                        },
                        {
                            code: 'REQ_MAINTENANCE_TASK',
                            description: 'Opprett vedlikeholdsoppgave når medium er CO₂',
                            severity: 'LOW',
                            condition: {
                                fact: 'medium',
                                operator: 'eq',
                                value: 'CO2',
                            },
                            outcome: {
                                type: 'TASK',
                                taskType: 'COLLECT_MAINTENANCE_DATA',
                                title: 'Kartlegg vedlikeholdsplan',
                                description: 'Innhent serviceavtale og historikk fra kunden',
                            },
                            metadata: { category: 'TASK' },
                            sources: {
                                create: [
                                    {
                                        title: 'TermoTeam Vedlikeholdsprosess',
                                    },
                                ],
                            },
                        },
                    ],
                },
            },
        });
        console.log('Seeded tenant rule set');
    } else {
        console.log('Tenant rule set already present, skipping');
    }
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
