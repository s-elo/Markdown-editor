import { useSelector } from 'react-redux';

import { Outline } from './Outline';

import { useGetDocQuery } from '@/redux-api/docs';
import { selectCurPath } from '@/redux-feature/curDocSlice';

export const OutlineContainer = () => {
  const curPath = useSelector(selectCurPath);
  const { data: curDoc } = useGetDocQuery(curPath);
  const { headings, keywords } = curDoc ?? { headings: [] as string[], keywords: [] as string[] };

  return (
    <div className="outline-container">
      <Outline headings={headings} keywords={keywords} path={curPath.split('-')} />
    </div>
  );
};
