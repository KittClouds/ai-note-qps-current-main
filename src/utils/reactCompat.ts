
import { unstable_batchedUpdates } from 'react-dom';

export const batchUpdates = unstable_batchedUpdates;

export const getBatchingInfo = () => ({
  framework: 'React',
  version: '18',
  batchingFunction: 'unstable_batchedUpdates'
});
