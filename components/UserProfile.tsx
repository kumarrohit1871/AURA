import React, { useState, useRef, useEffect } from 'react';

// A simple Logout icon component
const LogoutIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
    </svg>
);

// A simple Settings icon (burger menu) component, now used as a toggle
const MenuIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
    </svg>
);


export const UserProfile = ({ displayName, userName, onLogout, history, assistantName, isSidebarExpanded, onToggleSidebar, voicePreference, onVoicePreferenceChange }) => {
    const getInitials = (name) => {
        if (!name) return '?';
        const names = name.split(' ');
        if (names.length > 1) {
            return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
        }
        return name.substring(0, 2).toUpperCase();
    };

    return (
        <aside className={`flex flex-col h-screen bg-gray-900/80 border-r border-gray-800 transition-all duration-300 ease-in-out ${isSidebarExpanded ? 'w-72 p-6' : 'w-24 p-4 items-center'}`}>
            <div className="w-full flex items-center justify-between mb-8">
                <div className="flex items-center space-x-4 overflow-hidden">
                    <div className="w-14 h-14 rounded-full bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center text-xl font-bold flex-shrink-0">
                        {getInitials(displayName)}
                    </div>
                    {isSidebarExpanded && (
                        <div className="whitespace-nowrap">
                            <h2 className="text-lg font-semibold text-gray-100">{displayName}</h2>
                            <p className="text-sm text-gray-400">@{userName}</p>
                        </div>
                    )}
                </div>
                <div className="relative flex-shrink-0">
                    <button
                        onClick={onToggleSidebar}
                        className="p-2 text-gray-400 rounded-full hover:bg-gray-800 hover:text-white transition-colors"
                        aria-label={isSidebarExpanded ? 'Collapse Sidebar' : 'Expand Sidebar'}
                    >
                        <MenuIcon />
                    </button>
                </div>
            </div>

            {isSidebarExpanded && (
              <div className="flex-1 flex flex-col min-h-0">
                  <h3 className="px-2 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">History</h3>
                  <nav className="flex-1 overflow-y-auto space-y-1 -mx-2 px-2">
                      {history && history.length > 0 ? (
                          history.map((item, index) => (
                              <div key={item.timestamp + index} className="p-2 rounded-lg hover:bg-gray-800/60 cursor-pointer group" title={`User: ${item.user}\nAssistant: ${item.assistant}`}>
                                  <p className="text-sm text-gray-200 font-medium truncate group-hover:text-white">{item.user}</p>
                                  <p className="text-xs text-gray-400 truncate group-hover:text-gray-300 mt-1">{item.assistant}</p>
                              </div>
                          ))
                      ) : (
                          <div className="text-center text-sm text-gray-500 mt-8 px-2">
                              No conversation history yet. Say "{assistantName}" to begin.
                          </div>
                      )}
                  </nav>
              </div>
            )}


            <div className="mt-auto pt-4 w-full">
                {/* Fix: Add voice preference UI to utilize the passed props and fix the error. */}
                {isSidebarExpanded && (
                    <div className="mb-6">
                        <h4 className="px-2 mb-2 text-xs font-semibold tracking-wider text-gray-500 uppercase">Voice Preference</h4>
                        <div className="flex justify-between p-1 space-x-1 bg-gray-800 rounded-lg">
                            <button onClick={() => onVoicePreferenceChange('auto')} className={`w-full px-2 py-1 text-sm font-medium rounded-md transition-colors ${voicePreference === 'auto' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:bg-gray-700'}`}>Auto</button>
                            <button onClick={() => onVoicePreferenceChange('male')} className={`w-full px-2 py-1 text-sm font-medium rounded-md transition-colors ${voicePreference === 'male' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:bg-gray-700'}`}>Male</button>
                            <button onClick={() => onVoicePreferenceChange('female')} className={`w-full px-2 py-1 text-sm font-medium rounded-md transition-colors ${voicePreference === 'female' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:bg-gray-700'}`}>Female</button>
                        </div>
                    </div>
                )}
                <button
                    onClick={onLogout}
                    className={`flex items-center justify-center px-4 py-3 text-gray-300 bg-gray-800 rounded-lg hover:bg-gray-700/70 transition-colors ${isSidebarExpanded ? 'w-full' : 'w-auto'}`}
                >
                    <LogoutIcon />
                    {isSidebarExpanded && <span className="ml-3">Logout</span>}
                </button>
            </div>
        </aside>
    );
};