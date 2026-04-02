import { useState, useEffect } from 'react';
import api from '../lib/api';
import { useAuth } from '../hooks/useAuth';

const CATEGORY_ORDER = ['Proposal', 'Finance', 'Project', 'Delivery', 'Post-project'];

const STATUS_DOT = {
  pending: 'bg-[#d0d0c8]',
  in_progress: 'bg-[#f0b429]',
  done: 'bg-[#2d7a2d]',
};

function LoadingSkeleton() {
  return (
    <div className="space-y-3 animate-pulse">
      <div className="h-2 bg-[#f0f0ea] rounded-full w-full" />
      {[...Array(4)].map((_, i) => (
        <div key={i} className="h-7 bg-[#f7f8f5] rounded" />
      ))}
    </div>
  );
}

export default function ChecklistCard({ clientId }) {
  const { role } = useAuth();
  const isAdmin = role === 'admin';
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [loadingTasks, setLoadingTasks] = useState(false);

  const [showNewProjectModal, setShowNewProjectModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDesc, setNewProjectDesc] = useState('');
  const [savingProject, setSavingProject] = useState(false);

  const [showAddTask, setShowAddTask] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskCategory, setNewTaskCategory] = useState('Project');
  const [newTaskVisible, setNewTaskVisible] = useState(true);
  const [savingTask, setSavingTask] = useState(false);

  useEffect(() => {
    if (!clientId) return;
    let cancelled = false;
    setLoadingProjects(true);
    setProjects([]);
    setSelectedProjectId(null);
    setTasks([]);
    api.get(`/projects?clientId=${clientId}`)
      .then(res => {
        if (cancelled) return;
        setProjects(res.data);
        if (res.data.length > 0) setSelectedProjectId(res.data[0].id);
      })
      .catch(err => { if (!cancelled) console.error('fetch projects:', err); })
      .finally(() => { if (!cancelled) setLoadingProjects(false); });
    return () => { cancelled = true; };
  }, [clientId]);

  useEffect(() => {
    if (!selectedProjectId) { setTasks([]); return; }
    let cancelled = false;
    setLoadingTasks(true);
    api.get(`/projects/${selectedProjectId}/checklist`)
      .then(res => { if (!cancelled) setTasks(res.data); })
      .catch(err => { if (!cancelled) console.error('fetch checklist:', err); })
      .finally(() => { if (!cancelled) setLoadingTasks(false); });
    return () => { cancelled = true; };
  }, [selectedProjectId]);

  const selectedProject = projects.find(p => p.id === selectedProjectId);
  const completedCount = tasks.filter(t => t.status === 'done').length;
  const totalCount = tasks.length;
  const percentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  async function toggleTask(task) {
    const newStatus = task.status === 'done' ? 'pending' : 'done';
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: newStatus } : t));
    try {
      await api.put(`/projects/${selectedProjectId}/checklist/${task.id}`, { status: newStatus });
    } catch (err) {
      console.error('toggle task:', err);
      setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: task.status } : t));
    }
  }

  async function handleCreateProject(e) {
    e.preventDefault();
    if (!newProjectName.trim()) return;
    setSavingProject(true);
    try {
      const res = await api.post('/projects', {
        clientId,
        name: newProjectName.trim(),
        description: newProjectDesc.trim(),
        status: 'active',
      });
      setProjects(prev => [res.data, ...prev]);
      setSelectedProjectId(res.data.id);
      setShowNewProjectModal(false);
      setNewProjectName('');
      setNewProjectDesc('');
    } catch (err) {
      console.error('create project:', err);
    } finally {
      setSavingProject(false);
    }
  }

  async function handleAddTask(e) {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;
    setSavingTask(true);
    try {
      const res = await api.post(`/projects/${selectedProjectId}/checklist`, {
        title: newTaskTitle.trim(),
        category: newTaskCategory,
        visibleToClient: newTaskVisible,
      });
      setTasks(prev => [...prev, res.data]);
      setNewTaskTitle('');
      setNewTaskCategory('Project');
      setNewTaskVisible(true);
      setShowAddTask(false);
    } catch (err) {
      console.error('add task:', err);
    } finally {
      setSavingTask(false);
    }
  }

  async function handleDeleteTask(task) {
    if (!task.isCustom) return;
    try {
      await api.delete(`/projects/${selectedProjectId}/checklist/${task.id}`);
      setTasks(prev => prev.filter(t => t.id !== task.id));
    } catch (err) {
      console.error('delete task:', err);
    }
  }

  const grouped = CATEGORY_ORDER.reduce((acc, cat) => {
    const catTasks = tasks.filter(t => t.category === cat);
    if (catTasks.length > 0) acc[cat] = catTasks;
    return acc;
  }, {});
  const otherTasks = tasks.filter(t => !CATEGORY_ORDER.includes(t.category));
  if (otherTasks.length > 0) grouped['Other'] = otherTasks;

  return (
    <>
      <div className="bg-white border border-[#eceee6] rounded-xl p-5">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3
            className="text-sm font-semibold text-[#1a2a1a]"
            style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}
          >
            Project Checklist
          </h3>
          <button
            onClick={() => setShowNewProjectModal(true)}
            className="text-xs px-2.5 py-1 bg-[#f0f7f0] text-[#2d7a2d] rounded-md hover:bg-[#e0f0e0] transition-colors font-medium"
            style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}
          >
            + New Project
          </button>
        </div>

        {loadingProjects ? (
          <LoadingSkeleton />
        ) : projects.length === 0 ? (
          <div className="py-6 text-center">
            <p className="text-sm text-[#7a8a7a] mb-3" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>
              No projects yet.
            </p>
            <button
              onClick={() => setShowNewProjectModal(true)}
              className="text-sm px-3 py-1.5 bg-[#2d7a2d] text-white rounded-md hover:bg-[#256425] transition-colors"
              style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}
            >
              + New Project
            </button>
          </div>
        ) : (
          <>
            {/* Project list */}
            <div className="mb-4 space-y-1">
              {projects.map(p => (
                <div
                  key={p.id}
                  onClick={() => setSelectedProjectId(p.id)}
                  className={`flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer group transition-colors ${
                    p.id === selectedProjectId
                      ? 'bg-[#f0f7f0] border border-[#c8e6c8]'
                      : 'hover:bg-[#f7f8f5] border border-transparent'
                  }`}
                >
                  <span
                    className="text-sm text-[#1a2a1a] truncate"
                    style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}
                  >
                    {p.name}
                  </span>
                  {isAdmin && (
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        if (!window.confirm(`Delete project "${p.name}" and all its tasks?`)) return;
                        api.delete(`/projects/${p.id}`).then(() => {
                          setProjects(prev => {
                            const remaining = prev.filter(x => x.id !== p.id);
                            if (selectedProjectId === p.id) {
                              setSelectedProjectId(remaining.length > 0 ? remaining[0].id : null);
                              setTasks([]);
                            }
                            return remaining;
                          });
                        }).catch(err => console.error('delete project:', err));
                      }}
                      className="opacity-0 group-hover:opacity-100 transition-opacity text-[#c0392b] hover:text-[#922b21] shrink-0 ml-2"
                      title="Delete project"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Progress bar */}
            {!loadingTasks && totalCount > 0 && (
              <div className="mb-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-[#7a8a7a]" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>
                    {completedCount} / {totalCount} tasks
                  </span>
                  <span className="text-xs font-medium text-[#2d7a2d]" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>
                    {percentage}%
                  </span>
                </div>
                <div className="w-full bg-[#f0f0ea] rounded-full h-2">
                  <div
                    className="bg-[#2d7a2d] h-2 rounded-full transition-all duration-300"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            )}

            {/* Tasks */}
            {loadingTasks ? (
              <LoadingSkeleton />
            ) : totalCount === 0 ? (
              <p className="text-sm text-[#7a8a7a] py-2" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>
                No tasks yet.
              </p>
            ) : (
              <div className="space-y-4">
                {Object.entries(grouped).map(([category, catTasks]) => (
                  <div key={category}>
                    <p
                      className="text-xs font-semibold text-[#7a8a7a] uppercase tracking-wide mb-1.5"
                      style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}
                    >
                      {category}
                    </p>
                    <div className="space-y-1">
                      {catTasks.map(task => (
                        <div
                          key={task.id}
                          className="flex items-center gap-2.5 py-1.5 px-2 rounded-lg hover:bg-[#f7f8f5] transition-colors group"
                        >
                          <input
                            type="checkbox"
                            checked={task.status === 'done'}
                            onChange={() => toggleTask(task)}
                            className="w-4 h-4 rounded cursor-pointer accent-[#2d7a2d] shrink-0"
                          />
                          <span
                            className={`flex-1 text-sm min-w-0 ${task.status === 'done' ? 'line-through text-[#aaa]' : 'text-[#1a2a1a]'}`}
                            style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}
                          >
                            {task.title}
                          </span>
                          {task.isCustom && (
                            <span
                              className="text-xs px-2 py-0.5 rounded-full bg-[#f0f7f0] text-[#2d7a2d] shrink-0"
                              style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}
                            >
                              custom
                            </span>
                          )}
                          <span
                            className={`w-2 h-2 rounded-full shrink-0 ${STATUS_DOT[task.status] || STATUS_DOT.pending}`}
                          />
                          {isAdmin && task.isCustom && (
                            <button
                              onClick={() => handleDeleteTask(task)}
                              className="opacity-0 group-hover:opacity-100 transition-opacity text-[#c0392b] hover:text-[#922b21] shrink-0"
                              title="Delete task"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                              </svg>
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Add custom task */}
            {selectedProjectId && !loadingTasks && (
              <div className="mt-4 pt-3 border-t border-[#f0f0ea]">
                {showAddTask ? (
                  <form onSubmit={handleAddTask} className="space-y-2">
                    <input
                      autoFocus
                      type="text"
                      value={newTaskTitle}
                      onChange={e => setNewTaskTitle(e.target.value)}
                      placeholder="Task title"
                      className="w-full text-sm border border-[#eceee6] rounded-md px-3 py-1.5 text-[#1a2a1a] focus:outline-none focus:ring-1 focus:ring-[#2d7a2d]"
                      style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}
                    />
                    <select
                      value={newTaskCategory}
                      onChange={e => setNewTaskCategory(e.target.value)}
                      className="w-full text-sm border border-[#eceee6] rounded-md px-3 py-1.5 text-[#1a2a1a] bg-white focus:outline-none focus:ring-1 focus:ring-[#2d7a2d]"
                      style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}
                    >
                      {CATEGORY_ORDER.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <label
                      className="flex items-center gap-1.5 text-xs text-[#4a5a4a] cursor-pointer select-none"
                      style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}
                    >
                      <input
                        type="checkbox"
                        checked={newTaskVisible}
                        onChange={e => setNewTaskVisible(e.target.checked)}
                        className="accent-[#2d7a2d]"
                      />
                      Visible to client
                    </label>
                    <div className="flex gap-2">
                      <button
                        type="submit"
                        disabled={savingTask || !newTaskTitle.trim()}
                        className="text-sm px-3 py-1.5 bg-[#2d7a2d] text-white rounded-md hover:bg-[#256425] disabled:opacity-50 transition-colors"
                        style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}
                      >
                        {savingTask ? 'Adding…' : 'Add'}
                      </button>
                      <button
                        type="button"
                        onClick={() => { setShowAddTask(false); setNewTaskTitle(''); }}
                        className="text-sm px-3 py-1.5 border border-[#eceee6] text-[#4a5a4a] rounded-md hover:bg-[#f7f8f5] transition-colors"
                        style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                ) : (
                  <button
                    onClick={() => setShowAddTask(true)}
                    className="text-sm text-[#7a8a7a] hover:text-[#2d7a2d] transition-colors"
                    style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}
                  >
                    + Add custom task
                  </button>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* New Project Modal */}
      {showNewProjectModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/30"
          onClick={e => { if (e.target === e.currentTarget) setShowNewProjectModal(false); }}
        >
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
            <h2
              className="text-base font-semibold text-[#1a2a1a] mb-4"
              style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}
            >
              New Project
            </h2>
            <form onSubmit={handleCreateProject} className="space-y-3">
              <div>
                <label
                  className="block text-xs font-medium text-[#4a5a4a] mb-1"
                  style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}
                >
                  Project name *
                </label>
                <input
                  autoFocus
                  type="text"
                  value={newProjectName}
                  onChange={e => setNewProjectName(e.target.value)}
                  placeholder="e.g. Website Redesign"
                  className="w-full text-sm border border-[#eceee6] rounded-md px-3 py-2 text-[#1a2a1a] focus:outline-none focus:ring-1 focus:ring-[#2d7a2d]"
                  style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}
                />
              </div>
              <div>
                <label
                  className="block text-xs font-medium text-[#4a5a4a] mb-1"
                  style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}
                >
                  Description
                </label>
                <textarea
                  value={newProjectDesc}
                  onChange={e => setNewProjectDesc(e.target.value)}
                  rows={3}
                  placeholder="Optional project description"
                  className="w-full text-sm border border-[#eceee6] rounded-md px-3 py-2 text-[#1a2a1a] focus:outline-none focus:ring-1 focus:ring-[#2d7a2d] resize-none"
                  style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}
                />
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  type="submit"
                  disabled={savingProject || !newProjectName.trim()}
                  className="flex-1 py-2 bg-[#2d7a2d] text-white text-sm rounded-md hover:bg-[#256425] disabled:opacity-50 transition-colors"
                  style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}
                >
                  {savingProject ? 'Creating…' : 'Create Project'}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowNewProjectModal(false); setNewProjectName(''); setNewProjectDesc(''); }}
                  className="flex-1 py-2 border border-[#eceee6] text-[#4a5a4a] text-sm rounded-md hover:bg-[#f7f8f5] transition-colors"
                  style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
