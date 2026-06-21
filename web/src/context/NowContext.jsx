import { createContext, useContext, useEffect, useState } from 'react';

const NowContext = createContext(Date.now());

/** מקור שעון יחיד שמתקתק כל שנייה — נצרך ע"י טיימרי הספירה לאחור ובאדג' "חדש" */
export function NowProvider({ children, intervalMs = 1000 }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);

  return <NowContext.Provider value={now}>{children}</NowContext.Provider>;
}

export function useNow() {
  return useContext(NowContext);
}
