import { useEffect, useState } from "react";
import PropTypes from "prop-types";
import useYMap from "../../hooks/useYMap";
import dataManagerSubdocs from "../../lib/dataSubDoc";
import { appStore } from "../../stores/appStore";
import { libraryStore } from "../../stores/libraryStore";
import { useDeviceType } from "../../ConfigProviders/DeviceTypeProvider";
import TipTapEditor from "../../../editor/TIpTapEditor/TipTapEditor";

/**
 *
 * @param {{ytree: YTree, paperId: string}} param0
 * @returns
 */
const PaperPanel = ({ ytree, paperId }) => {
  console.log("library details panel rendering: ", paperId);
  const setPanelOpened = appStore((state) => state.setPanelOpened);
  const setItemId = libraryStore((state) => state.setItemId);

  const paperMapState = useYMap(ytree.getNodeValueFromKey(paperId));

  console.log("Paper Props Map STATE: ", paperMapState);

  const [paperProperties, setPaperProperties] = useState({
    item_title: "",
  });

  useEffect(() => {
    setPaperProperties({
      item_title: paperMapState.item_title,
    });
  }, [paperId, paperMapState]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    console.log(name, value);
    setPaperProperties({
      ...paperProperties,
      [name]: value,
    });
  };

  const handleSave = (e) => {
    const paperMap = ytree.getNodeValueFromKey(paperId);

    paperMap.set("item_title", paperProperties.item_title);
  };

  return (
    <div
      id="PaperDetailContainer"
      className="w-full h-full flex flex-col items-center justify-start"
    >
      <div
        id="CreatePaperHeader"
        className="h-detailsPanelHeaderHeight min-h-detailsPanelHeaderHeight w-full flex items-center justify-start border-b border-appLayoutBorder shadow-sm shadow-appLayoutShadow py-2 px-1 gap-1"
      >
        <button
          className={`w-libraryManagerAddButtonSize min-w-libraryManagerAddButtonSize h-libraryManagerAddButtonSize transition-colors duration-200 p-1 ml-1 rounded-full hover:bg-appLayoutHover hover:text-appLayoutHighlight flex items-center justify-center
             order-first
          `}
          onClick={() => {
            setPanelOpened(true);
            setItemId("unselected");
          }}
        >
          <span className="icon-[material-symbols-light--arrow-back-rounded] hover:text-appLayoutHighlight rounded-full w-full h-full"></span>
        </button>

        <input
          className="bg-appBackground flex-grow h-full text-detailsPanelNameFontSize focus:bg-appLayoutInputBackground rounded-lg focus:outline-none py-1 pb-2 px-2 pr-1 transition-colors duration-200"
          name="item_title"
          onChange={handleChange}
          value={paperProperties.item_title}
        />

        <button
          className={`w-libraryManagerAddButtonSize min-w-libraryManagerAddButtonSize h-libraryManagerAddButtonSize transition-colors duration-200 p-1 mr-2 rounded-full hover:bg-appLayoutInverseHover hover:text-appLayoutHighlight flex items-center justify-center
             order-last
          `}
          onClick={handleSave}
        >
          <span className="icon-[material-symbols-light--check-rounded] hover:text-appLayoutHighlight rounded-full w-full h-full"></span>
        </button>
      </div>

      <div
        id="CreatePaperBody"
        className="w-full flex-grow min-h-0 min-w-0 basis-0"
      >
        <TipTapEditor
          yXmlFragment={ytree.getNodeValueFromKey(paperId).get("paper_xml")}
        />
      </div>
    </div>
  );
};

export default PaperPanel;
