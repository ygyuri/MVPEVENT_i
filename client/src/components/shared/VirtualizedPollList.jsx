import React, { useCallback } from 'react';
import { FixedSizeList as List } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';
import PollCard from '../attendee/PollCard';

const VirtualizedPollList = ({ polls, itemHeight = 400, onVoteSuccess }) => {
  const Row = useCallback(({ index, style }) => (
    <div style={style} className="px-2 py-2">
      <PollCard poll={polls[index]} onVoteSuccess={onVoteSuccess} />
    </div>
  ), [polls, onVoteSuccess]);

  if (!Array.isArray(polls) || polls.length === 0) return null;

  return (
    <AutoSizer>
      {({ height, width }) => (
        <List
          height={height}
          width={width}
          itemCount={polls.length}
          itemSize={itemHeight}
          overscanCount={4}
        >
          {Row}
        </List>
      )}
    </AutoSizer>
  );
};

export default VirtualizedPollList;
