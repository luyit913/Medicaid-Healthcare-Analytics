/** Enrollment year and quality reporting year are deliberately separate. */
export const defaults = Object.freeze({page:'enrollment', enrollmentYear:2024, state:'WA', reportingYear:2024, measure:'CBP-AD', selectedComparisonState:null});
export function createStore() {
  let state = {...defaults};
  const listeners = new Set();
  return {
    get: () => ({...state}),
    set(patch) {
      const next = {...state, ...patch};
      if (next.reportingYear !== state.reportingYear || next.measure !== state.measure) next.selectedComparisonState = null;
      state = next;
      listeners.forEach(listener => listener({...state}));
    },
    reset() { state = {...defaults, page:state.page}; listeners.forEach(listener => listener({...state})); },
    subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); }
  };
}
