// GENERATED FROM catalogue.json — do not edit.
//
// Each tool's arguments, as its inputSchema declares them, so a scenario's mock is checked
// against the tool it answers. Regenerate it whenever the catalogue is regenerated.

export type MetalK8sToolArguments = {
  describeKubeResource: {
    kind: "pods" | "nodes" | "deployments" | "statefulsets" | "daemonsets" | "jobs" | "cronjobs" | "services" | "persistentvolumeclaims" | "persistentvolumes" | "events" | "configmaps" | "customresourcedefinitions" | "namespaces";
    name: string;
    namespace?: string;
    includeEvents?: boolean;
  };
  getPodLogs: {
    pod: string;
    namespace: string;
    container?: string;
    tailLines?: number;
    sinceSeconds?: number;
    sinceTime?: string;
    limitBytes?: number;
    previous?: boolean;
    timestamps?: boolean;
    pattern?: string;
    contextLines?: number;
  };
  listKubeResources: {
    kind: string;
    apiVersion?: string;
  };
};
