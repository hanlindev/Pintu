import * as _ from 'lodash';
import {DiagramEngine, DiagramModel, DiagramEngineListener, DiagramListener as DiagramModelListener, LinkModel} from 'storm-react-diagrams';
import {Dispatch} from 'react-redux';
import {LinkListener} from './LinkListener';
import {IDiagramChange} from '../interfaces';
import {LinkAdded, LinkRemoved} from '../events';

export interface IDiagramEvents {
  onDiagramChange: (linkChange: IDiagramChange) => void;
  onSerializeDiagram: (serialized: string) => void;
}

export class DiagramListener implements DiagramModelListener, DiagramEngineListener {
  static singleInstance: DiagramListener;

  private diagram: DiagramModel;

  private constructor(
    readonly diagramEngine: DiagramEngine,
    readonly events: IDiagramEvents,
  ) {
    this.diagram = diagramEngine.getDiagramModel();
    this.diagramEngine.addListener(this);
    this.diagram.addListener(this);
  }

  private serializeDiagram() {
    const serialized = JSON.stringify(this.diagram.serializeDiagram());
    this.events.onSerializeDiagram(serialized);
  }

  nodesUpdated?(node: any, isCreated: boolean): void {
  }

  linksUpdated?(link: LinkModel, isCreated: boolean): void {
    if (isCreated) {
      link.addListener(new LinkListener(link, this.events));
      _.defer(() => {
        this.events.onDiagramChange(new LinkAdded(link));
      });
    } else {
      _.defer(() => {
        this.events.onDiagramChange(new LinkRemoved(link));
      })
    }
  }

  offsetUpdated?(model: DiagramModel, offsetX: number, offsetY: number): void {

  }

  zoomUpdated?(model: DiagramModel, zoom: number): void {

  }

  nodeFactoriesUpdated?(): void {

  }

  linkFactoriesUpdated?(): void {

  }

  repaintCanvas?(): void {
  }

  static register(
    engine: DiagramEngine,
    events: IDiagramEvents,
  ) {
    DiagramListener.singleInstance = new DiagramListener(engine, events);
  }
}