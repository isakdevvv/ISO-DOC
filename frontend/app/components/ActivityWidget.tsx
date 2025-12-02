import React from 'react';

interface ActivityWidgetProps {
    activity: any[];
}

export default function ActivityWidget({ activity }: ActivityWidgetProps) {
    return (
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
                <h3 className="text-lg font-semibold text-gray-900">Recent Activity</h3>
            </div>
            <div className="divide-y divide-gray-100">
                {activity.length === 0 ? (
                    <div className="p-6 text-center text-gray-500">No recent activity</div>
                ) : (
                    activity.map((item) => (
                        <div key={item.id} className="p-4 hover:bg-gray-50 transition-colors flex justify-between items-center">
                            <div>
                                <div className="font-medium text-gray-900">{item.title}</div>
                                <div className="text-xs text-gray-500">Updated: {new Date(item.updatedAt).toLocaleDateString()}</div>
                            </div>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${item.status === 'ANALYZED' ? 'bg-green-100 text-green-800' :
                                    item.status === 'ERROR' ? 'bg-red-100 text-red-800' :
                                        'bg-yellow-100 text-yellow-800'
                                }`}>
                                {item.status}
                            </span>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
