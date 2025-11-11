import React, { useState, useEffect } from 'react';
import { AuraLogo } from './AuraLogo';
import { signUp, login } from '../services/auth';

// By defining the AuthModal component outside of WelcomeScreen, we prevent it from being
// recreated on every render, which fixes the input focus (cursor jumping) issue.
const AuthModal = ({
  isModalOpen,
  modalView,
  onClose,
  onSwitchView,
  loginUserName,
  onLoginUserNameChange,
  loginPassword,
  onLoginPasswordChange,
  loginError,
  onLoginSubmit,
  signupSuccess,
  formUserName,
  onFormUserNameChange,
  formDisplayName,
  onFormDisplayNameChange,
  formEmail,
  onFormEmailChange,
  formPassword,
  onFormPasswordChange,
  formAssistantName,
  onFormAssistantNameChange,
  onSignupSubmit,
  signupError,
}) => {
  if (!isModalOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-start justify-center overflow-y-auto p-4" onClick={onClose}>
      <div className="relative w-full max-w-md my-auto" onClick={(e) => e.stopPropagation()}>
          <button onClick={onClose} className="absolute -top-2 -right-2 text-white bg-gray-800 rounded-full p-1 hover:bg-gray-700 z-10">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>

          {modalView === 'login' && (
            <div>
                <div className="bg-gray-900 rounded-2xl p-8 border border-gray-800">
                    <h2 className="text-3xl font-bold text-center mb-6 text-gray-200">Welcome Back</h2>
                    {signupSuccess && <p className="text-green-400 text-sm text-center mb-4">{signupSuccess}</p>}
                    <form onSubmit={onLoginSubmit}>
                        <div className="mb-4">
                          <label htmlFor="login-username" className="block text-gray-400 mb-2">Username</label>
                          <input 
                              type="text" 
                              id="login-username"
                              value={loginUserName}
                              onChange={(e) => onLoginUserNameChange(e.target.value)}
                              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 text-gray-200" 
                              placeholder="Enter your username"
                              autoFocus
                          />
                        </div>
                         <div className="mb-6">
                          <label htmlFor="login-password" className="block text-gray-400 mb-2">Password</label>
                          <input 
                              type="password" 
                              id="login-password"
                              value={loginPassword}
                              onChange={(e) => onLoginPasswordChange(e.target.value)}
                              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 text-gray-200" 
                              placeholder="Enter your password"
                          />
                        </div>
                        {loginError && <p className="text-red-400 text-sm text-center mb-4 -mt-2">{loginError}</p>}
                        <button type="submit" disabled={!loginUserName.trim() || !loginPassword.trim()} className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white py-2 rounded-full font-semibold hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed">Login</button>
                    </form>
                    <p className="text-center text-gray-400 mt-6">Don't have an account? <button onClick={() => onSwitchView('signup')} className="text-purple-400 hover:underline">Sign Up</button></p>
                </div>
            </div>
          )}

          {modalView === 'signup' && (
            <div>
                <div className="bg-gray-900 rounded-2xl p-8 border border-gray-800">
                    <h2 className="text-3xl font-bold text-center mb-6 text-gray-200">Create Account</h2>
                    <form onSubmit={onSignupSubmit}>
                        <div className="mb-4">
                            <label htmlFor="signup-username" className="block text-gray-400 mb-2">Username</label>
                            <input type="text" value={formUserName} onChange={(e) => onFormUserNameChange(e.target.value)} id="signup-username" className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 text-gray-200" placeholder="e.g., jane_doe" autoFocus />
                        </div>
                         <div className="mb-4">
                            <label htmlFor="signup-displayname" className="block text-gray-400 mb-2">Your Name</label>
                            <input type="text" value={formDisplayName} onChange={(e) => onFormDisplayNameChange(e.target.value)} id="signup-displayname" className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 text-gray-200" placeholder="What should the assistant call you?" />
                        </div>
                        <div className="mb-4">
                            <label htmlFor="signup-email" className="block text-gray-400 mb-2">Email</label>
                            <input type="email" value={formEmail} onChange={(e) => onFormEmailChange(e.target.value)} id="signup-email" className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 text-gray-200" placeholder="Enter your email" />
                        </div>
                        <div className="mb-4">
                            <label htmlFor="signup-password" className="block text-gray-400 mb-2">Password</label>
                            <input type="password" value={formPassword} onChange={(e) => onFormPasswordChange(e.target.value)} id="signup-password" className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 text-gray-200" placeholder="Create a password" />
                        </div>
                        <div className="mb-4">
                            <label htmlFor="signup-assistantname" className="block text-gray-400 mb-2">Assistant's Name</label>
                            <input type="text" value={formAssistantName} onChange={(e) => onFormAssistantNameChange(e.target.value)} id="signup-assistantname" className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 text-gray-200" placeholder="e.g., Nova, Kai, Lyra" />
                        </div>
                        {signupError && <p className="text-red-400 text-sm text-center mb-2">{signupError}</p>}
                        <button type="submit" disabled={!formUserName.trim() || !formDisplayName.trim() || !formEmail.trim() || !formPassword.trim() || !formAssistantName.trim()} className="w-full mt-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white py-2 rounded-full font-semibold hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed">Create Account</button>
                    </form>
                    <p className="text-center text-gray-400 mt-6">Already have an account? <button onClick={() => onSwitchView('login')} className="text-purple-400 hover:underline">Login</button></p>
                </div>
            </div>
          )}
      </div>
    </div>
  )
};


export const WelcomeScreen = ({ onSetupSubmit }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalView, setModalView] = useState('signup');

  // State for Signup form
  const [formUserName, setFormUserName] = useState('');
  const [formDisplayName, setFormDisplayName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formAssistantName, setFormAssistantName] = useState('');
  const [signupError, setSignupError] = useState('');
  
  // State for Login form
  const [loginUserName, setLoginUserName] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [signupSuccess, setSignupSuccess] = useState('');

  useEffect(() => {
    const body = document.body;
    if (isModalOpen) {
      body.classList.add('overflow-hidden');
    } else {
      body.classList.remove('overflow-hidden');
    }
    return () => {
      body.classList.remove('overflow-hidden');
    };
  }, [isModalOpen]);

  const handleOpenModal = (view) => {
    setModalView(view);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };
  
  const handleSwitchView = (view) => {
    setModalView(view);
    setLoginError('');
    setSignupError('');
    setSignupSuccess('');
  }

  const handleSignupSubmit = async (e) => {
    e.preventDefault();
    setSignupError('');
    if (!formUserName.trim() || !formDisplayName.trim() || !formEmail.trim() || !formPassword.trim() || !formAssistantName.trim()) {
      return;
    }
    const userData = {
      userName: formUserName.trim(),
      displayName: formDisplayName.trim(),
      assistantName: formAssistantName.trim(),
      email: formEmail.trim(),
      password: formPassword,
    };

    try {
      await signUp(userData);
      // On successful signup, prompt user to log in
      setSignupSuccess('Account created successfully! Please log in.');
      setLoginUserName(userData.userName); // Pre-fill username for convenience
      setLoginPassword(''); // Ensure password field is empty
      setModalView('login');
      // Clear signup form fields for privacy
      setFormUserName('');
      setFormDisplayName('');
      setFormEmail('');
      setFormPassword('');
      setFormAssistantName('');
    } catch (error) {
      // Display signup error (e.g., username taken)
      setSignupError(error);
    }
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setLoginError('');
    if (!loginUserName.trim() || !loginPassword) return;

    try {
        const user = await login(loginUserName, loginPassword);
        onSetupSubmit(user.userName, user.displayName, user.assistantName);
    } catch (error) {
        setLoginError(error);
    }
  };

  const handleLoginUserNameChange = (value) => {
    setLoginUserName(value);
    if(loginError) setLoginError('');
    if(signupSuccess) setSignupSuccess('');
  }
  
  const handleLoginPasswordChange = (value) => {
    setLoginPassword(value);
    if(loginError) setLoginError('');
    if(signupSuccess) setSignupSuccess('');
  }

  const handleFormUserNameChange = (value) => { setFormUserName(value); if (signupError) setSignupError(''); };
  const handleFormDisplayNameChange = (value) => { setFormDisplayName(value); if (signupError) setSignupError(''); };
  const handleFormEmailChange = (value) => { setFormEmail(value); if (signupError) setSignupError(''); };
  const handleFormPasswordChange = (value) => { setFormPassword(value); if (signupError) setSignupError(''); };
  const handleFormAssistantNameChange = (value) => { setFormAssistantName(value); if (signupError) setSignupError(''); };

  return (
    <div className="bg-gray-900 text-white">
      <header className="fixed w-full bg-black/70 backdrop-blur-md z-40">
        <div className="flex items-center justify-between px-6 py-4 max-w-7xl mx-auto">
          <a href="#" className="flex items-center space-x-3">
            <AuraLogo />
            <span className="text-xl font-semibold">AURA</span>
          </a>
          <nav className="hidden md:flex items-center space-x-8 text-gray-300">
            <a href="#features" className="hover:text-white transition-colors">Features</a>
          </nav>
          <div className="hidden md:flex items-center gap-4">
            <button onClick={() => handleOpenModal('login')} className="text-gray-300 hover:text-white font-medium transition-colors">Login</button>
            <button onClick={() => handleOpenModal('signup')} className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-5 py-2 rounded-full font-medium hover:brightness-110 transition-all">
              Sign Up
            </button>
          </div>
          <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="md:hidden focus:outline-none">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
        <div className={`${isMenuOpen ? 'flex' : 'hidden'} flex-col bg-black/95 backdrop-blur-md border-t border-gray-800 text-center py-4 space-y-4 md:hidden`}>
          <a href="#features" className="block hover:text-gray-400">Features</a>
          <hr className="border-gray-700 w-1/2 mx-auto"/>
          <button onClick={() => handleOpenModal('login')} className="block w-full text-center hover:text-gray-400">Login</button>
          <button onClick={() => handleOpenModal('signup')} className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-5 py-2 rounded-full font-medium hover:brightness-110 transition-all w-1/2 mx-auto">
            Sign Up
          </button>
        </div>
      </header>

      <main>
        <section className="flex flex-col items-center justify-center text-center px-6 pt-40 pb-24 min-h-screen">
          <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight text-gray-100">
            Answers and Inspiration.<br className="hidden md:block" />Be more productive.
          </h1>
          <p className="text-gray-300 text-lg md:text-xl max-w-2xl mb-10">
            AURA is a powerful AI companion designed to enhance your productivity, creativity, and knowledge. Available for everyone.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <button onClick={() => handleOpenModal('signup')} className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-8 py-3 rounded-full font-semibold text-lg hover:brightness-110 transition-all hover-lift">
              Get Started →
            </button>
          </div>
        </section>

        <section id="features" className="max-w-6xl mx-auto px-6 grid gap-8 md:grid-cols-3 mb-24">
          <div className="bg-gray-800/50 rounded-2xl p-6 border border-transparent hover:border-purple-600 transition hover-lift">
            <img src="https://placehold.co/600x400/1e293b/8b5cf6?text=Conversations" alt="Feature 1" className="rounded-xl mb-4 w-full" />
            <h3 className="text-xl font-semibold mb-2 text-gray-200">Writes, brainstorms, and explores ideas with you</h3>
            <p className="text-gray-400 text-sm">Engage in natural, insightful conversations. Ask questions, get explanations, and explore ideas effortlessly.</p>
          </div>
          <div className="bg-gray-800/50 rounded-2xl p-6 border border-transparent hover:border-purple-600 transition hover-lift">
            <img src="https://placehold.co/600x400/1e293b/8b5cf6?text=Productivity" alt="Feature 2" className="rounded-xl mb-4 w-full" />
            <h3 className="text-xl font-semibold mb-2 text-gray-200">Summarize meetings and find new insights</h3>
            <p className="text-gray-400 text-sm">Turn raw text or uploads into actionable summaries, helping you save time and increase productivity.</p>
          </div>
          <div className="bg-gray-800/50 rounded-2xl p-6 border border-transparent hover:border-purple-600 transition hover-lift">
            <img src="https://placehold.co/600x400/1e293b/8b5cf6?text=Code" alt="Feature 3" className="rounded-xl mb-4 w-full" />
            <h3 className="text-xl font-semibold mb-2 text-gray-200">Generate and debug code to learn and build faster</h3>
            <p className="text-gray-400 text-sm">From simple scripts to full-blown automations, AURA can help you boost your coding workflows.</p>
          </div>
        </section>
      </main>

      <footer className="border-t border-gray-800 text-gray-500 text-sm py-6 text-center">
        © 2025 AURA · Terms · Privacy Policy
      </footer>

      <AuthModal
        isModalOpen={isModalOpen}
        modalView={modalView}
        onClose={handleCloseModal}
        onSwitchView={handleSwitchView}
        loginUserName={loginUserName}
        onLoginUserNameChange={handleLoginUserNameChange}
        loginPassword={loginPassword}
        onLoginPasswordChange={handleLoginPasswordChange}
        loginError={loginError}
        onLoginSubmit={handleLoginSubmit}
        signupSuccess={signupSuccess}
        formUserName={formUserName}
        onFormUserNameChange={handleFormUserNameChange}
        formDisplayName={formDisplayName}
        onFormDisplayNameChange={handleFormDisplayNameChange}
        formEmail={formEmail}
        onFormEmailChange={handleFormEmailChange}
        formPassword={formPassword}
        onFormPasswordChange={handleFormPasswordChange}
        formAssistantName={formAssistantName}
        onFormAssistantNameChange={handleFormAssistantNameChange}
        onSignupSubmit={handleSignupSubmit}
        signupError={signupError}
      />
    </div>
  );
};
