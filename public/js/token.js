export const initialToken = () => ({
  required: false,
  configured: true,
  editing: false,
  saving: false,
  error: '',
});

const withToken = (state, change) => ({ ...state, token: { ...state.token, ...change } });

export const applyTokenStatus = (state, { required, configured }) => withToken(state, { required, configured });

export const needsTokenScreen = (state) =>
  state.token.required && (!state.token.configured || state.token.editing);

export const editToken = (state) => (state.token.required ? withToken(state, { editing: true, error: '' }) : state);

export const cancelTokenEdit = (state) => withToken(state, { editing: false, error: '' });

export const startSavingToken = (state) => withToken(state, { saving: true, error: '' });

export const tokenSaved = (state) => withToken(state, { saving: false, configured: true, editing: false, error: '' });

export const tokenFailed = (state, message) => withToken(state, { saving: false, error: message });

export const tokenRejected = (state, message) =>
  withToken({ ...state, loading: false }, { configured: false, editing: false, saving: false, error: message });
