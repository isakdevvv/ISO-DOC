import DocumentEditor from '../../../../components/DocumentEditor';

export default function DocumentEditorPage({ params }: { params: { id: string } }) {
    return <DocumentEditor nodeId={params.id} />;
}
