import { useState, useCallback } from 'react';
export function useAsync<T = void>() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const run = useCallback(async (fn: () => Promise<T>): Promise<T | null> => {
        setLoading(true);
        setError(null);
        try {
            return await fn();
        }
        catch (e: any) {
            const msg = e?.response?.data?.message ?? e?.message ?? 'Something went wrong';
            setError(msg);
            return null;
        }
        finally {
            setLoading(false);
        }
    }, []);
    return { loading, error, run };
}
