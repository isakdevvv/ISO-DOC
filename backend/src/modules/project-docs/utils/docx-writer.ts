import { Document, HeadingLevel, Packer, Paragraph } from 'docx';

const headingMap: Record<number, HeadingLevel> = {
    1: HeadingLevel.HEADING_1,
    2: HeadingLevel.HEADING_2,
    3: HeadingLevel.HEADING_3,
    4: HeadingLevel.HEADING_4,
    5: HeadingLevel.HEADING_5,
    6: HeadingLevel.HEADING_6,
};

export async function markdownToDocxBuffer(markdown: string) {
    const lines = markdown.replace(/\r\n/g, '\n').split('\n');
    const paragraphs: Paragraph[] = [];

    for (const rawLine of lines) {
        const line = rawLine.trimEnd();
        if (!line.trim()) {
            paragraphs.push(new Paragraph(''));
            continue;
        }

        if (line.startsWith('#')) {
            const hash = line.match(/^#+/);
            const level = Math.min(hash ? hash[0].length : 1, 6);
            const text = line.replace(/^#+\s*/, '').trim();
            paragraphs.push(new Paragraph({
                text,
                heading: headingMap[level] ?? HeadingLevel.HEADING_1,
            }));
            continue;
        }

        if (/^[-*+]\s+/.test(line)) {
            const text = line.replace(/^[-*+]\s+/, '');
            paragraphs.push(new Paragraph({
                text,
                bullet: { level: 0 },
            }));
            continue;
        }

        paragraphs.push(new Paragraph(line));
    }

    if (!paragraphs.length) {
        paragraphs.push(new Paragraph(''));
    }

    const doc = new Document({
        sections: [
            {
                properties: {},
                children: paragraphs,
            },
        ],
    });

    return Packer.toBuffer(doc);
}
