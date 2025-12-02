'use client';

import React, { useEffect, useState } from 'react';
import { fetchTasks, updateTask, Task, isAuthenticationError, createProjectTask, fetchProjects } from '@/lib/api';
import { useRouter } from 'next/navigation';

export default function TaskInbox() {
    const router = useRouter();
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'PENDING' | 'COMPLETED' | 'ALL'>('PENDING');
    const [isCreating, setIsCreating] = useState(false);
    const [newTask, setNewTask] = useState({ title: '', description: '' });
    const [projectId, setProjectId] = useState<string | null>(null);

    useEffect(() => {
        async function init() {
            setLoading(true);
            try {
                // Fetch projects to get a valid context
                const projects = await fetchProjects();
                if (projects.length > 0) {
                    const pid = projects[0].id;
                    setProjectId(pid);
                    await loadTasks(pid);
                } else {
                    // No projects found, cannot load tasks
                    setLoading(false);
                }
            } catch (err) {
                if (!isAuthenticationError(err)) {
                    console.error('Failed to initialize tasks', err);
                }
                setLoading(false);
            }
        }
        init();
    }, []);

    useEffect(() => {
        if (projectId) {
            loadTasks(projectId);
        }
    }, [filter]);

    async function loadTasks(pid: string) {
        setLoading(true);
        try {
            const status = filter === 'ALL' ? undefined : filter;
            const fetchedTasks = await fetchTasks(pid, status);
            setTasks(fetchedTasks);
        } catch (err) {
            if (!isAuthenticationError(err)) {
                console.error('Failed to load tasks', err);
            }
        } finally {
            setLoading(false);
        }
    }

    async function handleStatusChange(taskId: string, newStatus: string) {
        if (!projectId) return;
        try {
            await updateTask(taskId, { status: newStatus });
            await loadTasks(projectId);
        } catch (err) {
            console.error(err);
            alert('Failed to update task status');
        }
    }

    async function handleCreateTask(e: React.FormEvent) {
        e.preventDefault();
        if (!newTask.title || !projectId) return;

        try {
            await createProjectTask(projectId, {
                title: newTask.title,
                description: newTask.description
            });
            setIsCreating(false);
            setNewTask({ title: '', description: '' });
            await loadTasks(projectId);
        } catch (err) {
            console.error(err);
            alert('Failed to create task');
        }
    }

    function handleTaskClick(task: Task) {
        if (task.type === 'MAINTENANCE_REPORT' || task.nodeId) {
            // Navigate to document editor if linked to a node
            router.push(`/documents/${task.nodeId}/edit`);
        } else {
            // Expand details (simple alert for now)
            alert(`Task: ${task.title}\n${task.description}`);
        }
    }

    return (
        <div className="h-full flex flex-col p-6 max-w-5xl mx-auto w-full relative">
            {isCreating && (
                <div className="fixed inset-0 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
                        <h2 className="text-xl font-bold mb-4">New Task</h2>
                        <form onSubmit={handleCreateTask} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                                <input
                                    type="text"
                                    value={newTask.title}
                                    onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                                    placeholder="Enter task title"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                                <textarea
                                    value={newTask.description}
                                    onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                                    placeholder="Enter description (optional)"
                                    rows={3}
                                />
                            </div>
                            <div className="flex justify-end gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setIsCreating(false)}
                                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg"
                                >
                                    Create Task
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-4">
                    <h1 className="text-2xl font-bold text-gray-900">Task Inbox</h1>
                    <button
                        onClick={() => setIsCreating(true)}
                        className="px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-1"
                    >
                        <span className="text-lg leading-none">+</span> New Task
                    </button>
                </div>
                <div className="flex gap-2 bg-gray-100 p-1 rounded-lg">
                    {(['PENDING', 'COMPLETED', 'ALL'] as const).map((f) => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${filter === f
                                ? 'bg-white text-blue-600 shadow-sm'
                                : 'text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            {f.charAt(0) + f.slice(1).toLowerCase()}
                        </button>
                    ))}
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
            ) : tasks.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                    <p className="text-gray-500">No tasks found</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {tasks.map((task) => (
                        <div
                            key={task.id}
                            className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow cursor-pointer"
                            onClick={() => handleTaskClick(task)}
                        >
                            <div className="flex justify-between items-start">
                                <div className="flex gap-4">
                                    <div className={`mt-1 h-3 w-3 rounded-full flex-shrink-0 ${task.priority > 5 ? 'bg-red-500' : 'bg-blue-500'
                                        }`} />
                                    <div>
                                        <h3 className="font-semibold text-gray-900">{task.title}</h3>
                                        <p className="text-sm text-gray-500 mt-1">{task.description}</p>
                                        <div className="flex gap-3 mt-3 text-xs text-gray-400">
                                            <span>{new Date(task.createdAt).toLocaleDateString()}</span>
                                            {task.assignee && <span>• Assigned to {task.assignee.name}</span>}
                                            {task.node && <span>• Linked to {task.node.title}</span>}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                                    {task.status === 'PENDING' && (
                                        <>
                                            <button
                                                onClick={() => handleStatusChange(task.id, 'COMPLETED')}
                                                className="px-3 py-1 text-xs font-medium text-green-700 bg-green-50 hover:bg-green-100 rounded-full border border-green-200"
                                            >
                                                Mark Complete
                                            </button>
                                            <button
                                                onClick={() => handleStatusChange(task.id, 'REJECTED')}
                                                className="px-3 py-1 text-xs font-medium text-red-700 bg-red-50 hover:bg-red-100 rounded-full border border-red-200"
                                            >
                                                Reject
                                            </button>
                                        </>
                                    )}
                                    <span className={`px-2 py-1 text-xs rounded-full ${task.status === 'COMPLETED' ? 'bg-gray-100 text-gray-600' :
                                        task.status === 'PENDING' ? 'bg-blue-50 text-blue-600' :
                                            'bg-red-50 text-red-600'
                                        }`}>
                                        {task.status}
                                    </span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
