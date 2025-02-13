import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import {
  sortArrayByOrder,
  sortArrayWithPropsByOrder,
} from "../../../utils/orderUtil";
import LibraryManagerNode from "./LibraryManagerNode";
import dataManagerSubdocs, {
  getArrayFromYDocMap,
} from "../../../lib/dataSubDoc";
import { YMapEvent } from "yjs";
import { useDeviceType } from "../../../ConfigProviders/DeviceTypeProvider";
import { useY } from "react-yjs";
import { equalityDeep, equalityFlat } from "lib0/function";

// TODO - Replace all these UseEffects with a singular useSyncExternalStore hook
const LibraryManager = () => {
  console.log("Library Manager Node was rendered");
  const { deviceType } = useDeviceType();

  const prevLibraryIdsWithPropsRef = useRef(null);

  const libraryIdsWithProps = useSyncExternalStore(
    (callback) => {
      dataManagerSubdocs.addLibraryYDocMapCallback(callback);
      const libraryIds = getArrayFromYDocMap(dataManagerSubdocs.libraryYDocMap);
      for (const [libraryId] of libraryIds.values()) {
        dataManagerSubdocs
          .getLibrary(libraryId)
          .getMap("library_props")
          .observe(callback);
      }

      return () => {
        dataManagerSubdocs.removeLibraryYDocMapCallback(callback);
        for (const [libraryId] of libraryIds.values()) {
          dataManagerSubdocs
            .getLibrary(libraryId)
            .getMap("library_props")
            .unobserve(callback);
        }
      };
    },
    () => {
      const libraryIds = getArrayFromYDocMap(dataManagerSubdocs.libraryYDocMap);

      const libraryIdsWithProps = [];
      for (const [libraryId] of libraryIds) {
        libraryIdsWithProps.push([
          libraryId,
          dataManagerSubdocs
            .getLibrary(libraryId)
            .getMap("library_props")
            .toJSON(),
        ]);
      }

      console.log("library Ids with props: ", libraryIdsWithProps);

      if (
        prevLibraryIdsWithPropsRef.current !== null &&
        prevLibraryIdsWithPropsRef.current !== undefined &&
        equalityDeep(prevLibraryIdsWithPropsRef.current, libraryIdsWithProps)
      ) {
        return prevLibraryIdsWithPropsRef.current;
      } else {
        prevLibraryIdsWithPropsRef.current = libraryIdsWithProps;
        return prevLibraryIdsWithPropsRef.current;
      }
    }
  );

  const sortedLibraryIds = useMemo(
    () => sortArrayWithPropsByOrder([...libraryIdsWithProps]),
    [libraryIdsWithProps]
  );

  return (
    <div id="LibraryManagerContainer" className={`h-full w-full flex flex-col`}>
      <div
        id="LibraryManagerHeader"
        className={`flex items-center justify-between px-1 h-libraryManagerHeaderHeight min-h-libraryManagerHeaderHeight border-b border-appLayoutBorder shadow-sm shadow-appLayoutShadow`}
      >
        <h1 className="h-fit w-fit pt-1 pb-[0.38rem] ml-4 text-libraryManagerHeaderText text-neutral-300 order-2">
          Your Libraries
        </h1>
        <button
          className={`w-libraryManagerAddButtonSize h-libraryManagerAddButtonSize transition-colors duration-200 p-1 mr-1 rounded-full hover:bg-appLayoutHover hover:text-appLayoutHighlight flex items-center justify-center order-4
 `}
          onClick={() => {
            dataManagerSubdocs.createEmptyLibrary();
          }}
        >
          <span className="icon-[material-symbols-light--add-2-rounded] hover:text-appLayoutHighlight rounded-full w-full h-full"></span>
        </button>
      </div>

      <div
        id="LibraryManagerBody"
        className={`flex-grow flex flex-col w-full justify-start items-center overflow-y-scroll ${
          deviceType === "mobile" ? "no-scrollbar" : "pl-[0.75rem]"
        }`}
      >
        <div
          id="LibraryListContainer"
          className="w-full h-fit flex flex-col justify-start items-center"
        >
          {sortedLibraryIds.length > 0 &&
            sortedLibraryIds.map(
              ([libraryId], index) =>
                dataManagerSubdocs.getLibrary(libraryId) && (
                  <div
                    key={libraryId}
                    id={`LibraryListNode-${index}`}
                    className="w-full h-libraryManagerNodeHeight min-h-libraryManagerNodeHeight border-b border-appLayoutBorder "
                  >
                    <LibraryManagerNode
                      libraryId={libraryId}
                      className=""
                      key={libraryId}
                    />
                  </div>
                )
            )}
        </div>
      </div>
    </div>
  );
};

export default LibraryManager;
