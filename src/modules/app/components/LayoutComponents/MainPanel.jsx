import { useEffect, useRef } from "react";
import { AnimatePresence, motion } from "motion/react";
import { libraryStore } from "../../stores/libraryStore";
import { checkForYTree, YTree } from "yjs-orderedtree";
import dataManagerSubdocs from "../../lib/dataSubDoc";
import { useDeviceType } from "../../ConfigProviders/DeviceTypeProvider";
import { appStore } from "../../stores/appStore";
import BookDetailsPanel from "../MainPanels/BookDetailsPanel";
import SectionDetailsPanel from "../MainPanels/SectionDetailsPanel";
import LibraryDetailsPanel from "../MainPanels/LibraryDetailsPanel";
import PaperPanel from "../MainPanels/PaperPanel";
import SettingsPanel from "../MainPanels/SettingsPanel";
import PaperSettingsPanel from "../MainPanels/PaperSettingsPanel";
import { templateStore } from "../../stores/templateStore";
import TemplateViewPanel from "../MainPanels/TemplateViewPanel";
import TemplateDetailsPanel from "../MainPanels/TemplateDetailsPanel";

const MainPanel = ({}) => {
  const { deviceType } = useDeviceType();
  const libraryId = libraryStore((state) => state.libraryId);
  const itemId = libraryStore((state) => state.itemId);
  const itemMode = libraryStore((state) => state.itemMode);

  const templateId = templateStore((state) => state.templateId);
  const templateMode = templateStore((state) => state.templateMode);

  const setShowActivityBar = appStore((state) => state.setShowActivityBar);

  const activity = appStore((state) => state.activity);

  const key = useRef("empty");

  /** @type {{current: YTree}} */
  const libraryYTreeRef = useRef(null);

  useEffect(() => {
    if (libraryId === "unselected") {
      libraryYTreeRef.current === null;
      return;
    }

    if (
      !checkForYTree(
        dataManagerSubdocs.getLibrary(libraryId).getMap("library_directory")
      )
    ) {
      throw new Error("Tried to access uninitialized directory");
    }

    libraryYTreeRef.current = new YTree(
      dataManagerSubdocs.getLibrary(libraryId).getMap("library_directory")
    );
  }, [libraryId]);

  const renderMainPanel = () => {
    if (activity === "libraries") {
      if (libraryId !== "unselected") {
        if (itemId !== "unselected") {
          key.current = "itemDetails-" + itemId;

          const itemMap = libraryYTreeRef.current.getNodeValueFromKey(itemId);

          if (itemMap) {
            if (itemMap.get("type") === "book") {
              return (
                <BookDetailsPanel
                  ytree={libraryYTreeRef.current}
                  bookId={itemId}
                />
              );
            }

            if (itemMap.get("type") === "section") {
              return (
                <SectionDetailsPanel
                  ytree={libraryYTreeRef.current}
                  sectionId={itemId}
                />
              );
            }

            if (itemMap.get("type") === "paper") {
              if (itemMode === "details") {
                return (
                  <PaperPanel
                    ytree={libraryYTreeRef.current}
                    paperId={itemId}
                    key={itemId}
                  />
                );
              }

              if (itemMode === "settings") {
                return (
                  <PaperSettingsPanel
                    ytree={libraryYTreeRef.current}
                    paperId={itemId}
                  />
                );
              }
            }
          }
        }

        key.current = "libraryDetails-" + libraryId;
        return <LibraryDetailsPanel libraryId={libraryId} />;
      }

      key.current = "empty";
      return <p>Home</p>;
    }

    if (activity === "templates") {
      if (templateId !== "unselected") {
        key.current = "templateDetails-" + templateId + "-" + templateMode;
        if (templateMode === "details") {
          return (
            <TemplateDetailsPanel templateId={templateId} key={templateId} />
          );
        }
        if (templateMode === "preview") {
          return <TemplateViewPanel templateId={templateId} key={templateId} />;
        }
      }

      key.current = "templates";
      return <p>templates main panel</p>;
    }

    if (activity === "settings") {
      key.current = "settings";
      return <SettingsPanel />;
    }

    key.current = "empty";
    return <p>Home</p>;
  };

  return deviceType === "mobile" ? (
    <AnimatePresence>
      <motion.div
        key={key.current}
        initial={{ y: 10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 10, opacity: 0 }}
        transition={{ duration: 0.1 }}
        className="w-full h-full bg-appBackground"
      >
        {renderMainPanel()}
      </motion.div>
    </AnimatePresence>
  ) : (
    <div className="flex-grow h-full bg-yellow-500">
      <p>Main</p>
    </div>
  );
};

export default MainPanel;
