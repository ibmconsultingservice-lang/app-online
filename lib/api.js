import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from './firebase'; // Your firebase config file

const functions = getFunctions(app);
const claudeInternal = httpsCallable(functions, 'callClaude');

export const callClaude = async (params) => {
  const result = await claudeInternal(params);
  return result.data.text;
};
