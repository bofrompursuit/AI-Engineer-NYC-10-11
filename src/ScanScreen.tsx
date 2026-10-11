import { useEffect, useState } from "react";
import ScanUploadView from "./ScanUploadView";
import GalleryScreen from "./GalleryScreen";
import type { PipAudio } from "./usePipVoice";

type SubView = "upload" | "gallery";

export default function ScanScreen({ goBack, audio, onPipContext }: { goBack: () => void; audio: PipAudio; onPipContext: (text: string) => void }) {
  const [subView, setSubView] = useState<SubView>("upload");
  const [galleryRefreshKey, setGalleryRefreshKey] = useState(0);
  useEffect(() => {
    if (subView === "gallery") onPipContext("Gallery of earlier scans. Help the learner understand what the gallery records. Do not claim to see a selected photo or live gallery data.");
  }, [subView, onPipContext]);

  const goToGallery = () => {
    setGalleryRefreshKey((k) => k + 1);
    setSubView("gallery");
  };

  return (
    <main className="subpage analytics-page scan-page page-enter">
      <div className="subpage-top">
        <button className="btn btn-outline" type="button" onClick={goBack}>← MISSION HUB</button>
        <span className="case-live"><i /> GEMINI + NIMBLE + TIGER DATA</span>
        <span className="case-id">SCAN-TO-LEARN</span>
      </div>

      <section className="report-heading">
        <div>
          <span className="eyebrow"><i /> LEARNING OPS / SCAN</span>
          <div className="case-title">Scan <em>& learn.</em></div>
          <p>Point your camera at anything real-world curious, answer PIP's question, and every scan lands in your gallery.</p>
        </div>
        <div className="range-control">
          <button className={subView === "upload" ? "active" : ""} type="button" onClick={() => { audio.prepare("scan"); setSubView("upload"); }}>
            UPLOAD
          </button>
          <button className={subView === "gallery" ? "active" : ""} type="button" onClick={goToGallery}>
            GALLERY
          </button>
        </div>
      </section>

      {subView === "upload" && <ScanUploadView audio={audio} onViewGallery={goToGallery} onPipContext={onPipContext} />}
      {subView === "gallery" && <GalleryScreen refreshKey={galleryRefreshKey} />}
    </main>
  );
}
