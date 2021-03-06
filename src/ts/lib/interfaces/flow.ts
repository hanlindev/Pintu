export type IActionDestination = 
{
  type: 'flow',
  flowID: string,
  stepID: string,
  sessionID?: string,
}
| {
  type: 'step',
  stepID: string,
}

export interface ISourceSpec {
  linkID: string;
  stepID: string;
  containerName: string;
  actionID: string;
}

export type IActionInputSource = {
  type: 'actionPayload',
  stepID: string;
  actionID: string;
  outputName: string;
};

export type IConstantInputSource = {
  type: 'constant',
  value: any,
};

export type IInputSource = IActionInputSource | IConstantInputSource;

export interface IInputSourceMap {
  [inputName: string]: IInputSource;
}

export interface ILinkSource {
  stepID: string;
  actionID: string;
}

export interface IFlowMetaData {
  urlIdOverride: string;
  description: string;
  name: string;
}

export interface IStepConfig {
  id: string;
  // The name of the container in ContainerRegistry
  containerName: string;
  sources: Array<ISourceSpec>,
  destinations: {[actionName: string]: IActionDestination};
  inputSources: IInputSourceMap;
  // This value is only used to render a meaningful step ID in the URL.
  // The destination, sources and input sources are still specified in the
  // step configs. Default: empty string
  urlIdOverride: string;
}

export interface IStepConfigMap {
  [stepID: string]: IStepConfig;
}

export interface IStepConfigMapChange {
  [stepID: string]: IStepConfig | null,
}

export interface IFlow {
  id: string;
  metaData: IFlowMetaData;
  firstStepID: string;
  steps: {[key: string]: IStepConfig};
  serializedDiagram: string | null;
}