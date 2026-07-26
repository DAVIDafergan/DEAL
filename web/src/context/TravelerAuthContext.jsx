import { createContext, useCallback, useContext, useState } from 'react';

const TravelerAuthContext = createContext(null);

const TOKEN_KEY = 'traveler_token';
const PROFILE_KEY = 'deal_radar_traveler';

function readStored() {
  try {
    const token = localStorage.getItem(TOKEN_KEY);
    const raw = localStorage.getItem(PROFILE_KEY);
    const traveler = raw ? JSON.parse(raw) : null;
    return { token, traveler };
  } catch {
    return { token: null, traveler: null };
  }
}

export function TravelerAuthProvider({ children }) {
  const [{ token, traveler }, setAuth] = useState(readStored);

  const travelerLogin = useCallback((token, user) => {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(PROFILE_KEY, JSON.stringify({ id: user.id, name: user.name, email: user.email }));
    setAuth({ token, traveler: { id: user.id, name: user.name, email: user.email } });
  }, []);

  const travelerLogout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(PROFILE_KEY);
    setAuth({ token: null, traveler: null });
  }, []);

  // 11.15 — after a profile edit (name change), the cached copy needs updating too — otherwise
  // every page reads the name the traveler logged in with until they log out and back in.
  const updateTravelerProfile = useCallback((patch) => {
    setAuth((prev) => {
      if (!prev.traveler) return prev;
      const next = { ...prev.traveler, ...patch };
      localStorage.setItem(PROFILE_KEY, JSON.stringify(next));
      return { ...prev, traveler: next };
    });
  }, []);

  return (
    <TravelerAuthContext.Provider value={{ travelerToken: token, traveler, travelerLogin, travelerLogout, updateTravelerProfile }}>
      {children}
    </TravelerAuthContext.Provider>
  );
}

export function useTravelerAuth() {
  return useContext(TravelerAuthContext);
}
