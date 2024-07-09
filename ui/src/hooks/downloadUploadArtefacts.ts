type UploadChunk = {
  rangeStartIndex: number;
  rangeEndIndex: number;
  rangeSize: number;
};

type IncompleteArtifacts = {
  version: string;
  path: string;
  sha256sum: string;
  size: number;
  uploadedChunks: UploadChunk[];
};

type VersionDescription = {
  v1: {
    version: string;
    artifacts: {
      [component: string]: {
        version: string;
        path: string;
        sha256sum: string;
        size: number;
      };
    };
  };
};

type UploadSessionStatus =
  | {
      status: 'incomplete';
      missingOrImcompleteArtifacts: {
        [component: string]: IncompleteArtifacts;
      };
    }
  | { status: 'complete' };

type UseMultipartDownloadUploadOptions = {
  packagesClient: PackagesClient;
  artifactsClient: ArtifactsClient;
  versionClient: VersionClient;
};

type PackagesClient = {
  // packages.scality.com
  // init with Scality packages credentials
  downloadChunk: ({
    artescaVersion,
    rangeStartIndex,
    rangeEndIndex,
    component,
  }: {
    artescaVersion: string;
    rangeStartIndex: number;
    rangeEndIndex: number;
    component: string;
  }) => Promise<Blob>; //GET
};

type VersionClient = {
  getVersionDescription: (
    artescaVersion: string,
  ) => Promise<VersionDescription>; //GET
};

type ArtifactsClient = {
  //MetalK8s backend API
  initUploadSession: (
    versionDescription: VersionDescription,
  ) => Promise<UploadSessionStatus>; //POST
  getUploadSession: () => Promise<UploadSessionStatus>; //GET
  uploadChunk: ({
    component,
    version,
    sha256sum,
    uploadChunk,
    chunk,
  }: {
    component: string;
    version: string;
    sha256sum: string;
    uploadChunk: UploadChunk;
    chunk: Blob;
  }) => Promise<IncompleteArtifacts & { isCompleted: boolean }>; //POST
  abortUploadSession: () => Promise<void>; //DELETE
};

type MultipartDownloadUpload =
  | {
      status: 'idle';
      start: () => {}; //call getVersionDescription()
    }
  | {
      status: 'ongoing';
      currentComponent: string; // the current component being downloaded / uploaded
      percentage: number;
      remainingTime: number;
      uploadSpeedAvg: number;
      downloadSpeedAvg: number;
      pause: () => {};
      abort: () => {};
    }
  | {
      status: 'completed';
      abort: () => {};
    }
  | {
      status: 'error';
      error: Error;
      retry: () => {};
      abort: () => {};
    }
  | {
      status: 'paused';
      currentComponent: string;
      percentage: number;
      resume: () => {};
      abort: () => {};
    }
  | {
      status: 'aborted';
    };

function useMultipartDownloadUpload(
  options: UseMultipartDownloadUploadOptions,
): MultipartDownloadUpload {
  return;
}
