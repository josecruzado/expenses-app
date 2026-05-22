import { browser } from '$app/environment';
import { writable } from 'svelte/store';

const MONTHLY_BUDGET_KEY = 'expenses.monthlyBudget';

function createMonthlyBudgetStore() {
    const initialValue = browser ? Number(window.localStorage.getItem(MONTHLY_BUDGET_KEY)) : 0;
    const { subscribe, set } = writable(Number.isFinite(initialValue) && initialValue > 0 ? initialValue : 0);

    return {
        subscribe,
        set(value: number) {
            const normalized = Number.isFinite(value) && value > 0 ? Math.round(value * 100) / 100 : 0;
            if (browser) {
                if (normalized > 0) window.localStorage.setItem(MONTHLY_BUDGET_KEY, String(normalized));
                else window.localStorage.removeItem(MONTHLY_BUDGET_KEY);
            }
            set(normalized);
        }
    };
}

export const monthlyBudget = createMonthlyBudgetStore();
