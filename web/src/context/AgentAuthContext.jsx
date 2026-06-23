import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { agentApi } from '../api/client.js';

const AgentAuthContext = createContext(null);

const TOKEN_KEY = 'agent_token';

export function AgentAuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY));
  const [agent, setAgent] = useState(null);
  const [loading, setLoading] = useState(!!localStorage.getItem(TOKEN_KEY));

  useEffect(() => {
    if (!token) { setLoading(false); return; }
    agentApi.getMe(token)
      .then(({ agent }) => setAgent(agent))
      .catch(() => { localStorage.removeItem(TOKEN_KEY); setToken(null); })
      .finally(() => setLoading(false));
  }, [token]);

  const login = useCallback(async (email, password) => {
    const { token: t, agent: a } = await agentApi.login(email, password);
    localStorage.setItem(TOKEN_KEY, t);
    setToken(t);
    setAgent(a);
    return a;
  }, []);

  const register = useCallback(async (data) => {
    const { token: t, agent: a } = await agentApi.register(data);
    localStorage.setItem(TOKEN_KEY, t);
    setToken(t);
    setAgent(a);
    return a;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setAgent(null);
  }, []);

  const refreshAgent = useCallback(async () => {
    if (!token) return;
    const { agent: a } = await agentApi.getMe(token);
    setAgent(a);
    return a;
  }, [token]);

  return (
    <AgentAuthContext.Provider value={{ token, agent, loading, login, register, logout, refreshAgent }}>
      {children}
    </AgentAuthContext.Provider>
  );
}

export function useAgentAuth() {
  return useContext(AgentAuthContext);
}
