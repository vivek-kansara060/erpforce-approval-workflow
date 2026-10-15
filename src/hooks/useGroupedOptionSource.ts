import { useCallback, useRef } from 'react';
import {
  mergeGroupedOptionPages,
  paginateGroupedOptions,
} from '../utils/option-source';
import type { SelectOptionGroup } from '../types/common';
import type { GroupedOptionPage, GroupedOptionQuery } from '../utils/option-source';

/**
 * Adapts an already-loaded grouped option list to the paginated `customFetchApi`
 * contract the ERP `SearchableSelect` expects.
 *
 * The accumulator lives in a ref scoped to this hook instance, so two criteria
 * rows open at the same time no longer share (and corrupt) one another's pages,
 * which the original module-level cache did.
 */
export const useGroupedOptionSource = (groups: Array<SelectOptionGroup<string>> | undefined) => {
  const accumulatedRef = useRef<Array<SelectOptionGroup<string>>>([]);
  const lastSearchRef = useRef<string>('');

  return useCallback(
    async (query: GroupedOptionQuery = {}): Promise<GroupedOptionPage> => {
      const search = query.search ?? '';
      const skip = query.skip ?? 0;

      // A new search, or a jump back to the first page, starts a fresh list.
      if (search !== lastSearchRef.current || skip === 0) {
        accumulatedRef.current = [];
        lastSearchRef.current = search;
      }

      const page = paginateGroupedOptions(groups, query);
            accumulatedRef.current = mergeGroupedOptionPages(accumulatedRef.current, page.data);

      return { data: accumulatedRef.current, pagination: page.pagination };
    },
    [groups],
  );
};
