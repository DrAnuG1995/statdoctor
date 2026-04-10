import { trackAppDownload } from "@/lib/tracking";

const APP_STORE_URL = "https://apps.apple.com/au/app/statdoctor/id6452677138";
const PLAY_STORE_URL = "https://play.google.com/store/apps/details?id=user.statdoctor.app&hl=en_AU";

interface AppStoreButtonsProps {
  className?: string;
}

export default function AppStoreButtons({ className = "" }: AppStoreButtonsProps) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <a
        href={APP_STORE_URL}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => trackAppDownload("ios")}
        className="transition-transform hover:scale-105"
      >
        <img
          src="https://cdn.prod.website-files.com/688db6d677516719c3925d01/68fa0d2a1d41210a78792018_pngegg%20(2).png"
          alt="Download on the App Store"
          className="h-11 w-auto"
          loading="lazy"
        />
      </a>
      <a
        href={PLAY_STORE_URL}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => trackAppDownload("android")}
        className="transition-transform hover:scale-105"
      >
        <img
          src="https://cdn.prod.website-files.com/688db6d677516719c3925d01/68fa0d1e7e5d4077dcdbc6e7_pngegg%20(1).png"
          alt="Get it on Google Play"
          className="h-11 w-auto"
          loading="lazy"
        />
      </a>
    </div>
  );
}
