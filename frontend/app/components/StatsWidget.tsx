import React from 'react';

interface StatsWidgetProps {
    stats: {
        totalDocuments: number;
        analyzedDocuments: number;
        averageComplianceScore: number;
    };
}

export default function StatsWidget({ stats }: StatsWidgetProps) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
                <div className="text-sm font-medium text-gray-500 mb-1">Total Documents</div>
                <div className="text-3xl font-bold text-gray-900">{stats.totalDocuments}</div>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
                <div className="text-sm font-medium text-gray-500 mb-1">Analyzed</div>
                <div className="text-3xl font-bold text-blue-600">{stats.analyzedDocuments}</div>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
                <div className="text-sm font-medium text-gray-500 mb-1">Avg. Compliance Score</div>
                <div className={`text-3xl font-bold ${stats.averageComplianceScore >= 80 ? 'text-green-600' :
                        stats.averageComplianceScore >= 50 ? 'text-yellow-600' : 'text-red-600'
                    }`}>
                    {stats.averageComplianceScore}%
                </div>
            </div>
        </div>
    );
}
