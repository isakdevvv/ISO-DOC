import { NodeRevisionChangeType, NodeStatus, PrismaClient, RuleSetScope } from '@prisma/client';

const prisma = new PrismaClient();

type ComponentTypeDefinition = {
    code: string;
    name: string;
    category: string;
    description: string;
    defaultFacts?: Record<string, any>;
    defaultMetadata?: Record<string, any>;
    fields?: Record<string, any>[];
};

type DemoComponentSeed = {
    id: string;
    code: string;
    name: string;
    tag?: string;
    serialNumber?: string;
    manufacturer?: string;
    installDate?: string;
    facts?: Record<string, any>;
    metadata?: Record<string, any>;
};

type DemoNodeSeed = {
    id: string;
    title: string;
    type: string;
    status: NodeStatus;
    templateCode?: string;
    templateVersion?: string;
    componentRef?: string;
    data?: Record<string, any>;
    facts?: Record<string, any>;
    metadata?: Record<string, any>;
};

type DemoEdgeSeed = {
    from: string;
    to: string;
    type: string;
    metadata?: Record<string, any>;
};

const COMPONENT_TYPES: ComponentTypeDefinition[] = [
    {
        code: 'CO2_COMPRESSOR',
        name: 'CO₂-kompressor',
        category: 'core',
        description: 'Hovedkompressor for CO₂-anlegg med variabel kapasitet.',
        defaultFacts: { max_ps_bar: 60, max_ts_c: 10 },
        defaultMetadata: { recommendedServiceMonths: 6 },
        fields: [
            { key: 'capacity_kw', label: 'Kapasitet (kW)', type: 'number' },
            { key: 'manufacturer', label: 'Produsent', type: 'text' },
            { key: 'oil_type', label: 'Oljetype', type: 'text' },
        ],
    },
    {
        code: 'CO2_EVAPORATOR',
        name: 'Fordamper',
        category: 'core',
        description: 'Fordamper for kjøl/frys med CO₂ som arbeidsmedium.',
        defaultFacts: { designTemperatureC: -25 },
        defaultMetadata: { cleaningIntervalMonths: 12 },
        fields: [
            { key: 'room', label: 'Plassering', type: 'text' },
            { key: 'airflow_m3h', label: 'Luftmengde (m³/h)', type: 'number' },
        ],
    },
    {
        code: 'SAFETY_VALVE',
        name: 'Sikkerhetsventil',
        category: 'safety',
        description: 'Ventiler som beskytter anlegget mot overtrykk.',
        defaultFacts: { openingPressureBar: 55 },
        defaultMetadata: { requiresThirdPartyTest: true },
        fields: [
            { key: 'diameter_mm', label: 'Diameter (mm)', type: 'number' },
            { key: 'certified_by', label: 'Sertifisert av', type: 'text' },
        ],
    },
    {
        code: 'EXPANSION_VALVE',
        name: 'Ekspansjonsventil',
        category: 'regulation',
        description: 'Ventil for regulering av masseflow i CO₂-krets.',
        defaultFacts: { controlType: 'Elektronisk' },
        defaultMetadata: { sparePart: true },
        fields: [
            { key: 'kv', label: 'Kv-verdi', type: 'number' },
            { key: 'sensor', label: 'Sensor', type: 'text' },
        ],
    },
    {
        code: 'GAS_SENSOR',
        name: 'Gassensor',
        category: 'instrumentation',
        description: 'CO₂-sensor for romovervåkning.',
        defaultFacts: { alarmLevelPpm: 5000 },
        defaultMetadata: { requiresCalibration: true },
        fields: [
            { key: 'zone', label: 'Sone', type: 'text' },
            { key: 'calibration_date', label: 'Sist kalibrert', type: 'date' },
        ],
    },
];

const DEMO_COMPONENTS: DemoComponentSeed[] = [
    {
        id: 'component-demo-compressor',
        code: 'CO2_COMPRESSOR',
        name: 'Kompressor A',
        tag: 'COMP-A',
        serialNumber: 'BITZER-8812',
        manufacturer: 'Bitzer',
        installDate: '2024-02-12',
        facts: { capacityKw: 150, oil_type: 'RL68H' },
        metadata: { room: 'Maskinrom 2', standby: false },
    },
    {
        id: 'component-demo-evaporator',
        code: 'CO2_EVAPORATOR',
        name: 'Fordamper Fryserom',
        tag: 'EVAP-01',
        serialNumber: 'LU-9933',
        manufacturer: 'LU-VE',
        installDate: '2023-11-03',
        facts: { airflow_m3h: 4200, room: 'FR1' },
        metadata: { coilMaterial: 'Aluminium' },
    },
    {
        id: 'component-demo-safety',
        code: 'SAFETY_VALVE',
        name: 'Sikkerhetsventil Høytrykk',
        tag: 'SV-HT-01',
        serialNumber: 'LESER-2001',
        manufacturer: 'Leser',
        facts: { diameter_mm: 20, certified_by: 'DNV' },
        metadata: { location: 'Maskinrom 2' },
    },
    {
        id: 'component-demo-expansion',
        code: 'EXPANSION_VALVE',
        name: 'Ekspansjonsventil Mediumkulde',
        tag: 'EXV-MED-01',
        serialNumber: 'DANFOSS-5571',
        manufacturer: 'Danfoss',
        facts: { kv: 3.2, sensor: 'PT1000' },
        metadata: { circuit: 'Medium temp' },
    },
    {
        id: 'component-demo-gas-sensor',
        code: 'GAS_SENSOR',
        name: 'CO₂-sensor varemottak',
        tag: 'GAS-02',
        serialNumber: 'MSA-4521',
        manufacturer: 'MSA',
        facts: { zone: 'Varemottak', calibration_date: '2024-01-05' },
        metadata: { alarmSetpointPpm: 4500 },
    },
];

const DEMO_NODES: DemoNodeSeed[] = [
    {
        id: 'node-demo-project',
        title: 'TermoTeam Demo – Rema Fantoft',
        type: 'PROJECT_CONTEXT',
        status: NodeStatus.APPROVED,
        data: {
            summary: 'Hovedprosjekt for demo. Viser prosjektfakta, komponentregister og dokumentstrømmer.',
            customer: 'Rema 1000',
        },
        facts: { medium: 'CO2', psValue: 45, tsValue: -5, volume: 3.2 },
        metadata: { stage: 'demo' },
    },
    {
        id: 'node-demo-compressor',
        title: 'Kompressor A',
        type: 'COMPONENT',
        componentRef: 'component-demo-compressor',
        status: NodeStatus.APPROVED,
        data: { serviceIntervalMonths: 6, alarmLevel: 'VARSEL' },
        facts: { room: 'Maskinrom 2', redundancy: 'N+1' },
    },
    {
        id: 'node-demo-evaporator',
        title: 'Fordamper Fryserom',
        type: 'COMPONENT',
        componentRef: 'component-demo-evaporator',
        status: NodeStatus.APPROVED,
        data: { room: 'FR1', defrost: 'Elektrisk' },
        facts: { designTemperatureC: -25 },
    },
    {
        id: 'node-demo-safety',
        title: 'Sikkerhetsventil Høytrykk',
        type: 'COMPONENT',
        componentRef: 'component-demo-safety',
        status: NodeStatus.APPROVED,
        data: { inspectionMonths: 12 },
        facts: { certifiedBy: 'DNV' },
    },
    {
        id: 'node-demo-expansion',
        title: 'Ekspansjonsventil Mediumkulde',
        type: 'COMPONENT',
        componentRef: 'component-demo-expansion',
        status: NodeStatus.APPROVED,
        data: { control: 'Elektronisk' },
        facts: { circuit: 'MT', kv: 3.2 },
    },
    {
        id: 'node-demo-gas-sensor',
        title: 'CO₂-sensor Varemottak',
        type: 'INSTRUMENT',
        componentRef: 'component-demo-gas-sensor',
        status: NodeStatus.APPROVED,
        data: { alarmLevelPpm: 4500 },
        facts: { zone: 'Varemottak' },
    },
    {
        id: 'node-demo-fdv',
        title: 'FDV – Demo Prosjekt',
        type: 'FDV_DOCUMENT',
        status: NodeStatus.PENDING_REVIEW,
        templateCode: 'FDV_MAIN_V1',
        templateVersion: '1.0.0',
        data: { sections: ['overview', 'maintenance'], draftedBy: 'Seeder' },
        facts: { priority: 'HIGH' },
    },
    {
        id: 'node-demo-ce',
        title: 'CE/PED Dokumentasjon',
        type: 'CE_PED_DOCUMENT',
        status: NodeStatus.DRAFT,
        templateCode: 'CE_PED_V1',
        templateVersion: '1.0.0',
        data: { pedCategory: 'III', requirementsChecked: false },
    },
    {
        id: 'node-demo-risk',
        title: 'Risikovurdering – CO₂',
        type: 'RISK_DOCUMENT',
        status: NodeStatus.DRAFT,
        data: { leakScenarios: 3, ventilationOk: true },
    },
];

const DEMO_EDGES: DemoEdgeSeed[] = [
    { from: 'node-demo-project', to: 'node-demo-compressor', type: 'CONTAINS' },
    { from: 'node-demo-project', to: 'node-demo-evaporator', type: 'CONTAINS' },
    { from: 'node-demo-project', to: 'node-demo-safety', type: 'CONTAINS' },
    { from: 'node-demo-project', to: 'node-demo-expansion', type: 'CONTAINS' },
    { from: 'node-demo-project', to: 'node-demo-gas-sensor', type: 'CONTAINS' },
    { from: 'node-demo-compressor', to: 'node-demo-fdv', type: 'FEEDS' },
    { from: 'node-demo-evaporator', to: 'node-demo-fdv', type: 'FEEDS' },
    { from: 'node-demo-safety', to: 'node-demo-fdv', type: 'FEEDS' },
    { from: 'node-demo-expansion', to: 'node-demo-fdv', type: 'FEEDS' },
    { from: 'node-demo-gas-sensor', to: 'node-demo-fdv', type: 'FEEDS' },
    { from: 'node-demo-fdv', to: 'node-demo-ce', type: 'DEPENDS_ON' },
    { from: 'node-demo-fdv', to: 'node-demo-risk', type: 'DEPENDS_ON' },
];

async function seedArchivePolicy() {
    return prisma.archivePolicy.upsert({
        where: { id: 'default-archive-policy' },
        update: {
            name: 'Standard Archive',
            description: 'Hot storage 120 days then cold storage for 5 years',
            hotStorageDays: 120,
            coldStorageDays: 1825,
        },
        create: {
            id: 'default-archive-policy',
            name: 'Standard Archive',
            description: 'Hot storage 120 days then cold storage for 5 years',
            hotStorageDays: 120,
            coldStorageDays: 1825,
            metadata: { version: 1 },
        },
    });
}

async function seedTenant(archivePolicyId: string) {
    return prisma.tenant.upsert({
        where: { slug: 'termoteam' },
        update: {
            name: 'TermoTeam',
            archivePolicyId,
            contactEmail: 'platform@termoteam.example',
        },
        create: {
            name: 'TermoTeam',
            slug: 'termoteam',
            contactEmail: 'platform@termoteam.example',
            archivePolicyId,
            metadata: {
                region: 'NO',
            },
        },
    });
}

async function seedTemplates() {
    const templates = [
        {
            code: 'FDV_MAIN_V1',
            title: 'FDV – Standard',
            version: '1.0.0',
            description: 'Core FDV template used for TermoTeam deliveries.',
            schema: {
                template_id: 'FDV_MAIN_V1',
                version: '1.0.0',
                title: 'FDV – Standard',
                sections: [
                    {
                        id: 'overview',
                        title: 'Anleggsdata',
                        fields: [
                            { id: 'location', label: 'Lokasjon', type: 'text', required: true },
                            { id: 'ps', label: 'PS (bar)', type: 'number', autoFilled: true },
                            { id: 'medium', label: 'Medium', type: 'select', options: ['CO2', 'Ammoniakk', 'Luft'] },
                        ],
                    },
                    {
                        id: 'maintenance',
                        title: 'Vedlikehold',
                        fields: [
                            { id: 'interval', label: 'Intervall', type: 'text', source: 'manual' },
                            { id: 'responsible', label: 'Ansvarlig', type: 'text' },
                        ],
                    },
                ],
            },
            metadata: {
                tags: ['FDV', 'CORE'],
            },
        },
        {
            code: 'CE_PED_V1',
            title: 'CE/PED Dokumentasjon',
            version: '1.0.0',
            description: 'Dekker PED-krav når PS * V > 50.',
            schema: {
                template_id: 'CE_PED_V1',
                version: '1.0.0',
                title: 'CE/PED Dokumentasjon',
                sections: [
                    {
                        id: 'scope',
                        title: 'PED Scope',
                        fields: [
                            { id: 'psv', label: 'PS * V', type: 'number', autoFilled: true },
                            { id: 'category', label: 'PED kategori', type: 'select', options: ['I', 'II', 'III', 'IV'] },
                        ],
                    },
                    {
                        id: 'compliance',
                        title: 'Compliancetiltak',
                        fields: [
                            { id: 'standards', label: 'Standardreferanser', type: 'table', columns: ['Standard', 'Kapittel'] },
                        ],
                    },
                ],
            },
            metadata: {
                tags: ['PED', 'Compliance'],
            },
        },
    ];

    for (const template of templates) {
        await prisma.documentTemplate.upsert({
            where: { code: template.code },
            update: {
                title: template.title,
                description: template.description,
                version: template.version,
                schema: template.schema,
                metadata: template.metadata,
            },
            create: template,
        });
    }
}

async function seedRuleSets() {
    const ruleSets = [
        {
            code: 'TEK17_CORE',
            title: 'TEK17 Baseline',
            description: 'Metadata and warning thresholds from TEK17.',
            version: '1.0.0',
            scope: RuleSetScope.GLOBAL,
            metadata: { owner: 'TermoTeam' },
            rules: [
                {
                    code: 'TEK17-6-3',
                    description: 'PS * V over 50 krever PED vurdering',
                    severity: 'VARSEL',
                    appliesTo: { mediums: ['CO2', 'NH3'], min_psv: 50 },
                    condition: { expression: 'psValue * volume > 50' },
                    outcome: { action: 'FLAG_PED_SCOPE', nextTask: 'GENERATE_CE_PED' },
                    metadata: {},
                    sources: [
                        { title: 'TEK17 §6-3', reference: 'Kap.6', url: 'https://dibk.no/regelverk/tek17' },
                    ],
                },
                {
                    code: 'TEK17-8-1',
                    description: 'Anlegg med medium CO₂ krever ekstra risikovurdering',
                    severity: 'NOTE',
                    appliesTo: { mediums: ['CO2'] },
                    condition: { expression: 'medium == "CO2"' },
                    outcome: { action: 'CREATE_TASK', template: 'GENERATE_CO2_RISK' },
                    metadata: {},
                    sources: [
                        { title: 'TEK17 §8-1', reference: 'Kap.8', url: 'https://dibk.no/regelverk/tek17' },
                    ],
                },
            ],
        },
        {
            code: 'EU_PRESSURE_EQUIPMENT',
            title: 'EU Pressure Equipment Directive',
            description: 'EU PED metadata for CO₂ prosjekter.',
            version: '1.0.0',
            scope: RuleSetScope.GLOBAL,
            metadata: { region: 'EU' },
            rules: [
                {
                    code: 'PED-ANNEX-I-2.2',
                    description: 'PED kategori bestemmes av PS og volum',
                    severity: 'VARSEL',
                    appliesTo: { mediums: ['CO2'] },
                    condition: { expression: 'psValue >= 30 && volume >= 1' },
                    outcome: { action: 'SET_PED_CATEGORY', category: 'III' },
                    metadata: {},
                    sources: [
                        { title: 'PED Annex I', reference: '2.2', url: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=celex%3A32014L0068' },
                    ],
                },
            ],
        },
        {
            code: 'NS_EN_378',
            title: 'NS-EN 378 Kravsett',
            description: 'Krav til sikkerhet og miljø for kuldeanlegg.',
            version: '1.0.0',
            scope: RuleSetScope.GLOBAL,
            metadata: { owner: 'Standards Norway' },
            rules: [
                {
                    code: 'NSEN378-ALARM',
                    description: 'Rom med opphold > 10 min må ha CO₂-varsel',
                    severity: 'VARSEL',
                    appliesTo: { mediums: ['CO2'], occupancy: 'HIGH' },
                    condition: { expression: 'medium == "CO2" && facts?.roomType == "OCCUPIED"' },
                    outcome: { action: 'REQUIRE_ALARM', menu: 'ADD_GAS_SENSOR' },
                    sources: [
                        { title: 'NS-EN 378-1', reference: '5.3', url: 'https://standard.no' },
                    ],
                },
                {
                    code: 'NSEN378-VENTILATION',
                    description: 'Maskinrom skal dokumentere ventilasjonskapasitet',
                    severity: 'NOTE',
                    appliesTo: { mediums: ['CO2'] },
                    condition: { expression: 'facts?.room == "Maskinrom" && facts?.ventilation == null' },
                    outcome: { action: 'REQUEST_DATA', field: 'ventilation' },
                    sources: [
                        { title: 'NS-EN 378-3', reference: '7.4', url: 'https://standard.no' },
                    ],
                },
            ],
        },
        {
            code: 'TERMOTEAM_BASELINE',
            title: 'TermoTeam leveransekrav',
            description: 'Interne krav og best practices fra TermoTeam.',
            version: '1.0.0',
            scope: RuleSetScope.TENANT,
            metadata: { owner: 'TermoTeam' },
            rules: [
                {
                    code: 'TT-COMP-REDUNDANCY',
                    description: 'Kompressorer over 120 kW må ha backup eller plan for nedetid.',
                    severity: 'NOTE',
                    appliesTo: { componentType: 'CO2_COMPRESSOR', minCapacityKw: 120 },
                    condition: { expression: 'facts?.capacityKw >= 120 && !facts?.standby' },
                    outcome: { action: 'CREATE_TASK', template: 'PLAN_REDUNDANCY' },
                    sources: [
                        { title: 'TermoTeam installasjonsguide', reference: 'Kap.4', url: 'https://termoteam.example/guides' },
                    ],
                },
                {
                    code: 'TT-GAS-SENSOR',
                    description: 'Alle rom med mennesker må ha kalibrert CO₂-sensor',
                    severity: 'VARSEL',
                    appliesTo: { componentType: 'GAS_SENSOR' },
                    condition: { expression: '!facts?.calibration_date' },
                    outcome: { action: 'CREATE_TASK', template: 'CALIBRATE_SENSOR' },
                    sources: [
                        { title: 'TermoTeam driftshåndbok', reference: 'Sensorer', url: 'https://termoteam.example/manuals' },
                    ],
                },
            ],
        },
    ];

    for (const set of ruleSets) {
        const existing = await prisma.ruleSet.findFirst({
            where: {
                code: set.code,
                version: set.version,
                tenantId: null,
                projectId: null,
            },
        });

        const ruleSet = existing
            ? await prisma.ruleSet.update({
                where: { id: existing.id },
                data: {
                    title: set.title,
                    description: set.description,
                    metadata: set.metadata,
                    scope: set.scope,
                },
            })
            : await prisma.ruleSet.create({
                data: {
                    code: set.code,
                    title: set.title,
                    description: set.description,
                    version: set.version,
                    scope: set.scope,
                    metadata: set.metadata,
                },
            });

        for (const rule of set.rules) {
            const existingRule = await prisma.rule.findFirst({
                where: { ruleSetId: ruleSet.id, code: rule.code },
            });

            const ruleRecord = existingRule
                ? await prisma.rule.update({
                    where: { id: existingRule.id },
                    data: {
                        description: rule.description,
                        severity: rule.severity,
                        appliesTo: rule.appliesTo,
                        condition: rule.condition,
                        outcome: rule.outcome,
                        metadata: (rule as any).metadata ?? {},
                    },
                })
                : await prisma.rule.create({
                    data: {
                        ruleSetId: ruleSet.id,
                        code: rule.code,
                        description: rule.description,
                        severity: rule.severity,
                        appliesTo: rule.appliesTo,
                        condition: rule.condition,
                        outcome: rule.outcome,
                        metadata: (rule as any).metadata ?? {},
                    },
                });

            await prisma.ruleSource.deleteMany({ where: { ruleId: ruleRecord.id } });
            if (rule.sources?.length) {
                await prisma.ruleSource.createMany({
                    data: rule.sources.map((source) => ({
                        ruleId: ruleRecord.id,
                        title: source.title,
                        reference: source.reference,
                        url: source.url,
                        metadata: {},
                    })),
                });
            }
        }
    }
}

async function seedComponentTypes() {
    const map = new Map<string, string>();
    for (const definition of COMPONENT_TYPES) {
        const record = await prisma.componentType.upsert({
            where: { code: definition.code },
            update: {
                name: definition.name,
                category: definition.category,
                description: definition.description,
                defaultFacts: definition.defaultFacts ?? {},
                defaultMetadata: definition.defaultMetadata ?? {},
                fields: definition.fields ?? [],
            },
            create: {
                code: definition.code,
                name: definition.name,
                category: definition.category,
                description: definition.description,
                defaultFacts: definition.defaultFacts ?? {},
                defaultMetadata: definition.defaultMetadata ?? {},
                fields: definition.fields ?? [],
            },
        });
        map.set(definition.code, record.id);
    }
    return map;
}

async function seedDemoProject(tenantId: string, componentTypeMap: Map<string, string>) {
    const projectFacts = {
        medium: 'CO2',
        psValue: 45,
        tsValue: -5,
        volume: 3.2,
        address: 'Fantoft, Bergen',
    };

    const project = await prisma.project.upsert({
        where: { externalId: 'REMA_FANTOFT_CO2' },
        update: {
            name: 'Rema Fantoft CO₂',
            clientName: 'Rema 1000',
            address: 'Fantoft, Bergen',
            medium: 'CO2',
            psValue: 45,
            tsValue: -5,
            volume: 3.2,
            facts: projectFacts,
            metadata: { demo: true },
        },
        create: {
            externalId: 'REMA_FANTOFT_CO2',
            name: 'Rema Fantoft CO₂',
            clientName: 'Rema 1000',
            tenantId,
            address: 'Fantoft, Bergen',
            medium: 'CO2',
            psValue: 45,
            tsValue: -5,
            volume: 3.2,
            commissionedAt: new Date('2024-03-01'),
            facts: projectFacts,
            metadata: { demo: true },
        },
    });

    const componentLookup: Record<string, string> = {};
    for (const seed of DEMO_COMPONENTS) {
        const componentTypeId = componentTypeMap.get(seed.code);
        if (!componentTypeId) {
            throw new Error(`Component type ${seed.code} missing during seed`);
        }
        const record = await prisma.component.upsert({
            where: { id: seed.id },
            update: {
                name: seed.name,
                tag: seed.tag,
                serialNumber: seed.serialNumber,
                manufacturer: seed.manufacturer,
                componentTypeId,
                facts: seed.facts ?? {},
                metadata: seed.metadata ?? {},
            },
            create: {
                id: seed.id,
                tenantId,
                projectId: project.id,
                componentTypeId,
                name: seed.name,
                tag: seed.tag,
                serialNumber: seed.serialNumber,
                manufacturer: seed.manufacturer,
                installDate: seed.installDate ? new Date(seed.installDate) : undefined,
                facts: seed.facts ?? {},
                metadata: seed.metadata ?? {},
            },
        });
        componentLookup[seed.id] = record.id;
    }

    for (const nodeSeed of DEMO_NODES) {
        await createNodeWithRevision(tenantId, project.id, nodeSeed, componentLookup);
    }

    for (const edge of DEMO_EDGES) {
        await ensureNodeEdge(edge);
    }
}

async function createNodeWithRevision(
    tenantId: string,
    projectId: string,
    payload: DemoNodeSeed,
    componentLookup: Record<string, string>,
) {
    const existing = await prisma.node.findUnique({ where: { id: payload.id } });
    if (existing) {
        return existing;
    }

    const node = await prisma.node.create({
        data: {
            id: payload.id,
            tenantId,
            projectId,
            type: payload.type,
            title: payload.title,
            status: payload.status,
            templateCode: payload.templateCode,
            templateVersion: payload.templateVersion,
            componentId: payload.componentRef ? componentLookup[payload.componentRef] : undefined,
            data: payload.data ?? {},
            facts: payload.facts ?? {},
            metadata: payload.metadata ?? {},
        },
    });

    const revision = await prisma.nodeRevision.create({
        data: {
            nodeId: node.id,
            revisionNumber: 1,
            changeType: NodeRevisionChangeType.INITIAL,
            summary: 'Seeder opprettet initial node',
            payload: payload.data ?? {},
            newData: payload.data ?? {},
        },
    });

    await prisma.node.update({
        where: { id: node.id },
        data: { currentRevisionId: revision.id },
    });

    return node;
}

async function ensureNodeEdge(edge: DemoEdgeSeed) {
    await prisma.nodeEdge.upsert({
        where: {
            fromNodeId_toNodeId_edgeType: {
                fromNodeId: edge.from,
                toNodeId: edge.to,
                edgeType: edge.type,
            },
        },
        update: {
            metadata: edge.metadata ?? {},
        },
        create: {
            fromNodeId: edge.from,
            toNodeId: edge.to,
            edgeType: edge.type,
            metadata: edge.metadata ?? {},
        },
    });
}

async function main() {
    const archive = await seedArchivePolicy();
    const tenant = await seedTenant(archive.id);
    await seedTemplates();
    await seedRuleSets();
    const componentTypes = await seedComponentTypes();
    await seedDemoProject(tenant.id, componentTypes);
}

main()
    .catch((error) => {
        console.error('Seed failed', error);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
