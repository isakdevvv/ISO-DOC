import * as XLSX from 'xlsx';

export interface TemplateContext {
    siteName?: string | null;
    projectNumber?: string | null;
    medium?: string | null;
}

function buildWorkbook(data: (string | number | null)[][], sheetName: string) {
    const worksheet = XLSX.utils.aoa_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName.slice(0, 31));
    return XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' }) as Buffer;
}

export function buildXlsxTemplate(templateId: string, context: TemplateContext) {
    switch (templateId) {
        case 'risk_matrix_template':
            return buildWorkbook([
                ['Scenario', 'Beskrivelse', 'Sannsynlighet', 'Konsekvens', 'Tiltak/Barrierer', 'Ansvarlig'],
                ['Lekkasje maskinrom', `CO₂-anlegg ${context.siteName ?? ''}`, '', '', '', ''],
                ['Strømbrudd', '', '', '', '', ''],
                ['Feil på ventilasjon', '', '', '', '', ''],
            ], 'Risiko');
        case 'checklist_installation':
            return buildWorkbook([
                ['Steg', 'Kontrollpunkt', 'Utført av', 'Dato', 'Kommentar'],
                ['Montasje', 'Visuell kontroll av komponenter', '', '', ''],
                ['Montasje', 'Festepunkter/rammer kontrollert', '', '', ''],
            ], 'Montasje');
        case 'checklist_pressure_leak':
            return buildWorkbook([
                ['Steg', 'Kontroll', 'Trykk', 'Holdetid', 'Resultat', 'Signatur'],
                ['Trykktest', 'System fylt til testtrykk', '', '', '', ''],
                ['Lekkasjetest', 'Såpevann eller elektronisk test', '', '', '', ''],
            ], 'Trykk');
        case 'checklist_commissioning':
            return buildWorkbook([
                ['Steg', 'Punkt', 'Status', 'Kommentar', 'Signatur'],
                ['Idriftsettelse', 'Sikringsinnstillinger bekreftet', '', '', ''],
                ['Idriftsettelse', 'Alarmgrense kontrollert', '', '', ''],
            ], 'Idriftsettelse');
        case 'self_inspection_log':
            return buildWorkbook([
                ['Dato', 'Gjennomført av', 'Område', 'Observasjon', 'Tiltak', 'Status'],
                ['', '', '', '', '', ''],
                ['', '', '', '', '', ''],
            ], 'Egenkontroll');
        case 'deviation_log':
            return buildWorkbook([
                ['Dato', 'Avvik', 'Beskrivelse', 'Ansvarlig', 'Frist', 'Status'],
                ['', '', '', '', '', ''],
            ], 'Avvik');
        case 'critical_spares_list':
            return buildWorkbook([
                ['Komponent', 'Produsent', 'Type', 'Artikkelnummer', 'Lagerstatus', 'Kommentar'],
                ['', '', '', '', '', ''],
            ], 'Reservedeler');
        default:
            return buildWorkbook([
                ['Notat'],
                [`Ingen mal definert for ${templateId}`],
            ], 'Mal');
    }
}
