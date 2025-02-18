import React, { useRef, useState, useEffect, useCallback } from "react";
import PropTypes from "prop-types";
import { YTree } from "yjs-orderedtree";
import { useDrag, useDrop } from "react-dnd";
import useYMap from "../../../hooks/useYMap";
import dataManagerSubdocs from "../../../lib/dataSubDoc";
import { libraryStore } from "../../../stores/libraryStore";
import { appStore } from "../../../stores/appStore";
import { AnimatePresence, motion } from "motion/react";
import itemLocalStateManager from "../../../lib/itemLocalState";
import useOuterClick from "../../../../design-system/useOuterClick";
import { min, max } from "lib0/math";

/**
 *
 * @param {{ytree: YTree, itemId: string}} param0
 * @returns
 */
const DirectoryItemNode = ({ ytree, itemId }) => {
  console.log("Directory item node rendered: ", itemId);

  const setPanelOpened = appStore((state) => state.setPanelOpened);
  const setItemId = libraryStore((state) => state.setItemId);
  const setItemMode = libraryStore((state) => state.setItemMode);

  const dndRef = useRef(null);

  // Get the node value map and determine its type.
  const itemMapRef = useRef(ytree.getNodeValueFromKey(itemId));

  const textContainerRef = useRef(null);
  const textRef = useRef(null);
  const [fontSize, setFontSize] = useState(
    getComputedStyle(document.documentElement).getPropertyValue(
      "--libraryDirectoryBookNodeFontSize"
    )
  );

  const itemMapState = useYMap(itemMapRef.current);

  const [nodeChildrenState, setNodeChildrenState] = useState(
    ytree.getNodeChildrenFromKey(itemId)
  );

  const [isOpened, setIsOpened] = useState(
    itemLocalStateManager.isItemOpened(itemId)
  );

  useEffect(() => {
    const updateisOpened = (isOpened) => {
      setIsOpened(isOpened);
    };

    const itemMap = itemMapRef.current;
    const type = itemMap.get("type");

    if (!itemLocalStateManager.hasItemLocalState(itemId)) {
      itemLocalStateManager.createItemLocalState(itemId, {
        type: type,
        props: {},
      });
    }

    if (type === "section" || type === "book") {
      itemLocalStateManager.on(itemId, updateisOpened);
    }

    return () => {
      if (type === "section" || type === "book") {
        itemLocalStateManager.off(itemId, updateisOpened);
      }
    };
  }, [itemId]);

  // Update the header label (title) and children when the underlying Yjs node changes.
  useEffect(() => {
    const updateNodeChildrenState = () => {
      setNodeChildrenState(ytree.getNodeChildrenFromKey(itemId));
    };

    ytree.observe(updateNodeChildrenState);

    return () => {
      ytree.unobserve(updateNodeChildrenState);
    };
  }, [itemId, ytree]);

  const onCreateSectionClick = useCallback(() => {
    dataManagerSubdocs.createEmptySection(ytree, itemId);
    setIsOpened(true);
    itemLocalStateManager.setItemOpened(itemId, true);
  }, [ytree, itemId]);

  const onCreatePaperClick = useCallback(() => {
    dataManagerSubdocs.createEmptyPaper(ytree, itemId);
    setIsOpened(true);
    itemLocalStateManager.setItemOpened(itemId, true);
  }, [ytree, itemId]);

  const [{ isDragging }, drag] = useDrag(() => ({
    type: "ITEM",
    item: {
      id: itemMapRef.current.get("item_id"),
      type: itemMapRef.current.get("type"),
    },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  }));

  // "areaSelected" determines the hover area: top, middle, or bottom.
  const [areaSelected, setAreaSelected] = useState("top");
  const [isSelfSelected, setIsSelfSelected] = useState(false);
  const [isAncestor, setIsAncestor] = useState(false);

  const [{ isOverCurrent }, drop] = useDrop({
    accept: "ITEM",
    hover: (draggedItem, monitor) => {
      if (!dndRef.current) return;

      if (draggedItem.id === itemId) {
        setIsSelfSelected(true);
      } else {
        setIsSelfSelected(false);
      }

      if (
        ytree.isNodeUnderOtherNode(
          ytree.computedMap.get(itemId),
          ytree.computedMap.get(draggedItem.id)
        )
      ) {
        setIsAncestor(true);
      } else {
        setIsAncestor(false);
      }

      console.log("ancestor: ", isAncestor, " self selected: ", isSelfSelected);

      if (isAncestor || isSelfSelected) return;

      const hoverBoundingRect = dndRef.current.getBoundingClientRect();
      const buffer = 10; // pixels to define the top/bottom sensitive area
      const clientOffset = monitor.getClientOffset();
      const hoverClientY = clientOffset.y - hoverBoundingRect.top;

      if (hoverClientY < buffer) {
        setAreaSelected("top");
      } else if (hoverClientY > hoverBoundingRect.height - buffer) {
        setAreaSelected("bottom");
      } else {
        setAreaSelected("middle");
      }
    },
    drop: (draggedItem, monitor) => {
      // If a nested drop already handled this event, do nothing.
      if (monitor.didDrop()) return;

      if (draggedItem.id === itemId) {
        setIsSelfSelected(true);
      } else {
        setIsSelfSelected(false);
      }

      if (ytree.isNodeUnderOtherNode(itemId, draggedItem.id)) {
        setIsAncestor(true);
      } else {
        setIsAncestor(false);
      }

      if (isAncestor || isSelfSelected) return;

      // Get the parent of the current node.
      const parentId = ytree.getNodeParentFromKey(itemId);
      const parentChildren = ytree.getNodeChildrenFromKey(parentId);

      if (areaSelected !== "middle") {
        if (parentChildren.includes(draggedItem.id)) {
          console.log("is sibling");

          if (areaSelected === "top") {
            ytree.setNodeBefore(draggedItem.id, itemId);
          }

          if (areaSelected === "bottom") {
            ytree.setNodeAfter(draggedItem.id, itemId);
          }
        } else {
          console.log("not sibling");
          ytree.moveChildToParent(draggedItem.id, parentId);

          if (areaSelected === "top") {
            ytree.setNodeBefore(draggedItem.id, itemId);
          }

          if (areaSelected === "bottom") {
            ytree.setNodeAfter(draggedItem.id, itemId);
          }
        }
      } else {
        console.log("dropped middle");
        if (ytree.getNodeChildrenFromKey(itemId).includes(draggedItem.id)) {
          ytree.setNodeOrderToEnd(draggedItem.id, itemId);
        } else {
          ytree.moveChildToParent(draggedItem.id, itemId);
          ytree.setNodeOrderToEnd(draggedItem.id, itemId);
        }
      }
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
      isOverCurrent: monitor.isOver({ shallow: true }),
    }),
  });

  // Connect the ref to both drag and drop.
  drag(drop(dndRef));

  useEffect(() => {
    const textContainer = textContainerRef.current;
    const text = textRef.current;
    const checkOverflow = () => {
      if (textContainer && text) {
        const containerWidth = textContainer.offsetWidth - 10;
        const textWidth = text.scrollWidth;

        console.log("widths: ", containerWidth, textWidth);

        // Decrease/Increase the font size until the text fits
        let newFontSize = parseFloat(fontSize);

        newFontSize = newFontSize * (containerWidth / textWidth);

        newFontSize = min(
          newFontSize,
          parseFloat(
            getComputedStyle(document.documentElement).getPropertyValue(
              "--libraryDirectoryBookNodeFontSize"
            )
          )
        );

        newFontSize = max(newFontSize, 1);

        console.log("new Font size: ", newFontSize);

        setFontSize(`${newFontSize}rem`);
      }
    };

    checkOverflow();

    const observer = new ResizeObserver(checkOverflow);
    if (textContainer) {
      observer.observe(textContainer);
    }
    return () => {
      if (textContainer) {
        observer.unobserve(textContainer);
      }
    };
  }, [fontSize]);

  return (
    <div
      id="DirectoryItemNodeContainer"
      ref={dndRef}
      className={`
        bg-appBackground

        flex flex-col

        w-full h-fit
        
        ${isDragging ? "opacity-20" : ""}

        ${(() => {
          if (!isSelfSelected && !isAncestor && isOverCurrent) {
            if (areaSelected === "top")
              return "border-t border-b border-b-transparent border-t-blue-500";
            if (areaSelected === "bottom")
              return "border-b border-t border-t-transparent border-b-blue-500";
            if (areaSelected === "middle") return "bg-blue-500 bg-opacity-50";
          }
          return "border-y border-appBackground";
        })()}

   
          
          `}
    >
      <div
        id="DirectoryItemNodeHeader"
        className={`flex justify-between items-center  hover:bg-appLayoutHover bg-appBackground

          ${(() => {
            const type = itemMapRef.current.get("type");
            if (type === "paper") return "h-libraryDirectoryPaperNodeHeight ";
            if (type === "section")
              return "h-libraryDirectorySectionNodeHeight ";
            if (type === "book") return "h-libraryDirectoryBookNodeHeight ";
            return "";
          })()}

          transition-colors
          duration-200

        `}
      >
        {itemMapRef.current.get("type") == "paper" && (
          <>
            <button
              ref={textContainerRef}
              style={{ fontSize }}
              className="flex-grow min-w-0 flex items-center justify-start h-full pl-2"
              onClick={() => {
                console.log("edit paper button");
                setItemId(itemId);
                setItemMode("details");
                setPanelOpened(false);
              }}
            >
              <span
                ref={textRef}
                className="w-fit max-w-full overflow-hidden text-nowrap overflow-ellipsis"
              >
                {itemMapState.item_title}
              </span>
            </button>

            <OptionsButton
              options={[
                {
                  label: "Paper Settings",
                  icon: (
                    <span className="icon-[hugeicons--customize] h-full w-full"></span>
                  ),
                  callback: () => {
                    console.log("edit paper editor button");
                    setItemId(itemId);
                    setItemMode("settings");
                    setPanelOpened(false);
                  },
                },
              ]}
              className={
                "h-libraryDirectoryPaperNodeHeight w-libraryDirectoryPaperNodeHeight min-w-libraryDirectoryPaperNodeHeight"
              }
            />
          </>
        )}

        {(itemMapRef.current.get("type") === "section" ||
          itemMapRef.current.get("type") === "book") && (
          <>
            <button
              className="flex-grow min-w-0 flex items-center justify-start h-full"
              onClick={() => {
                const newOpenedState = !isOpened;
                setIsOpened(newOpenedState);
                itemLocalStateManager.setItemOpened(itemId, newOpenedState);
              }}
            >
              <motion.span
                animate={{ rotate: isOpened ? 90 : 0 }}
                transition={{ duration: 0.2 }}
                className={`icon-[material-symbols-light--keyboard-arrow-right] ${(() => {
                  const type = itemMapRef.current.get("type");

                  if (type === "section")
                    return "h-libraryDirectorySectionNodeIconSize w-libraryDirectorySectionNodeIconSize min-w-libraryDirectorySectionNodeIconSize";
                  if (type === "book")
                    return "h-libraryDirectoryBookNodeIconSize w-libraryDirectoryBookNodeIconSize min-w-libraryDirectorySectionNodeIconSize";
                  return "";
                })()}`}
              ></motion.span>

              <div
                style={{ fontSize }}
                ref={textContainerRef}
                className="flex-grow min-w-0 h-full flex items-center justify-start"
              >
                <span
                  ref={textRef}
                  className="w-fit max-w-full overflow-hidden text-nowrap overflow-ellipsis"
                >
                  {itemMapState.item_title}
                </span>
              </div>
            </button>

            <OptionsButton
              options={[
                {
                  label: "Edit Properties",
                  icon: (
                    <span className="icon-[mdi--edit-outline] h-full w-full"></span>
                  ),
                  callback: () => {
                    console.log("edit section details button");
                    setItemId(itemId);
                    setItemMode("details");
                    setPanelOpened(false);
                  },
                },
                {
                  label: "Create Section",
                  icon: (
                    <span className="icon-[mdi--folder-add-outline] h-full w-full"></span>
                  ),
                  callback: () => {
                    console.log("create section button");
                    onCreateSectionClick();
                  },
                },
                {
                  label: "Create Paper",
                  icon: (
                    <span className="icon-[mdi--paper-add-outline] h-full w-full"></span>
                  ),
                  callback: () => {
                    console.log("create paper button");
                    onCreatePaperClick();
                  },
                },
              ]}
              className={`${(() => {
                const type = itemMapRef.current.get("type");
                if (type === "section")
                  return "h-libraryDirectorySectionNodeHeight w-libraryDirectorySectionNodeHeight min-w-libraryDirectorySectionNodeHeight";
                if (type === "book")
                  return "h-libraryDirectoryBookNodeHeight w-libraryDirectoryBookNodeHeight min-w-libraryDirectoryBookNodeHeight";
                return "";
              })()}
              `}
            />
          </>
        )}
      </div>
      <AnimatePresence mode="wait">
        <motion.div
          className="w-full"
          key={isOpened ? "opened" : "closed"}
          initial={{ y: -10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -10, opacity: 0 }}
          transition={{ duration: 0.1 }}
        >
          {isOpened &&
            (itemMapRef.current.get("type") === "section" ||
              itemMapRef.current.get("type") === "book") && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "fit-content", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                id="DirectoryItemNodeBodyContainer"
                className={`w-full flex flex-row justify-start`}
              >
                <div
                  className={`w-libraryDirectoryBookNodeIconSize flex items-center justify-center`}
                >
                  <span className={`h-full w-px bg-appLayoutBorder`}></span>
                </div>
                <div
                  id="DirectoryItemNodeBody"
                  className="h-fit w-full grid grid-cols-1"
                >
                  {nodeChildrenState !== null &&
                    ytree
                      .sortChildrenByOrder(nodeChildrenState, itemId)
                      .map((childKey) => (
                        <div id="DirectoryItemNodeChild" key={childKey}>
                          <DirectoryItemNode ytree={ytree} itemId={childKey} />
                        </div>
                      ))}
                </div>
              </motion.div>
            )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

DirectoryItemNode.propTypes = {
  ytree: PropTypes.object.isRequired,
  itemId: PropTypes.string.isRequired,
};

export default DirectoryItemNode;

const OptionsButton = ({ options, className }) => {
  const [isOpened, setIsOpened] = useState(false);

  const buttonContainerRef = useOuterClick(() => {
    setIsOpened(false);
  });

  return (
    <div
      ref={buttonContainerRef}
      className={`relative transition-colors duration-200 p-[0.4rem]
                  text-appLayoutText
                  ${
                    isOpened
                      ? "bg-appLayoutPressed text-appLayoutHighlight shadow-inner shadow-appLayoutShadow"
                      : "hover:bg-appLayoutInverseHover hover:text-appLayoutHighlight"
                  }

                  ${className}
      `}
    >
      <button
        className="w-full h-full"
        onClick={() => {
          setIsOpened(!isOpened);
        }}
      >
        <span className="icon-[solar--menu-dots-bold] h-full w-full"></span>
      </button>
      <AnimatePresence>
        {isOpened && (
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.5, opacity: 0 }}
            transition={{ ease: "easeOut", duration: 0.1 }}
            className="absolute h-fit w-optionsDropdownWidth max-w-optionsDropdownWidth flex flex-col items-center 
                       rounded-md bg-appBackground border border-appLayoutBorder shadow-md shadow-appLayoutGentleShadow top-0 right-0 origin-top-right z-[99]"
          >
            {options?.map((option) => (
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                key={option.label}
                onClick={() => {
                  setIsOpened(false);
                  option.callback();
                }}
                className="flex items-center justify-start w-full h-optionsDropdownOptionHeight pl-1 py-1 gap-px
                           hover:bg-appLayoutInverseHover hover:text-appLayoutHighlight transition-colors duration-200"
              >
                <span className="h-optionsDropdownOptionHeight w-optionsDropdownOptionHeight min-w-optionsDropdownOptionHeight p-1">
                  {option.icon}
                </span>
                <span className="flex-grow pl-1 h-full text-optionsDropdownOptionFont flex items-center justify-start">
                  {option.label}
                </span>
              </motion.button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
