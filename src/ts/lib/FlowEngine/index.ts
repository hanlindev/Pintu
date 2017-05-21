import * as _ from 'lodash';
import {DefaultLinkFactory, DiagramEngine as SRDDiagramEngine, DiagramModel, LinkModel, LinkInstanceFactory, PortModel} from 'storm-react-diagrams';
import {Dispatch} from 'react-redux';
import {PintuNodeWidgetFactory} from '../../components/ui/diagrams/PintuNodeWidget';
import {PintuNodeModel, PintuNodeInstanceFactory} from '../../components/ui/diagrams/PintuNodeModel';
import {PintuActionPortFactory} from '../../components/ui/diagrams/PintuActionPortModel';
import {PintuInputPortFactory} from '../../components/ui/diagrams/PintuInputPortModel';
import {PintuEntrancePortFactory} from '../../components/ui/diagrams/PintuEntrancePortModel';
import {ContainerRegistry} from '../ContainerRegistry';
import {IStepConfig, IFlow, ILinkSource} from '../interfaces';
import {IFlowEngine} from './interfaces';
import {DiagramListener} from './listeners/DiagramListener';

/**
 * The StormReactDiagram engine works independently from the BuilderState's
 * data model. The diagram is always changed before the builder state change.
 * So the correct order of operation in Linking event is:
 * 1. Diagram change
 * 2. BuilderState change or reject the change if the change is invalid, e.g
 *    variable type violation.
 * 3. If BuilderState passes a change, the BuilderState will call
 *    FlowEngine::acceptChange(change). The the srcStep's action will configured
 *    to point to destStep. If this is not called, the link will not be
 *    persisted nor serialized.
 * 4. If BuilderState rejects a change, the BuilderState will call
 *    FlowEngine::rejectChange(change). The change will be reverted.
 */
export class FlowEngine implements IFlowEngine {
  static engines: {[id: string]: FlowEngine} = {};
  static registry: ContainerRegistry;

  private hasSynced: boolean;

  stepNodes: {[id: string]: PintuNodeModel} = {};
  engineImpl: SRDDiagramEngine;
  diagramModel: DiagramModel;

  get diagramEngine(): SRDDiagramEngine {
    return this.engineImpl;
  }
  
  private constructor(private id: string) {
    if (FlowEngine.engines[id]) {
      throw new TypeError(`Duplicate engine found for id - ${id}`);
    }

    this.engineImpl = new SRDDiagramEngine();
    this.engineImpl.registerInstanceFactory(new PintuNodeInstanceFactory());
    this.engineImpl.registerInstanceFactory(new PintuInputPortFactory());
    this.engineImpl.registerInstanceFactory(new PintuActionPortFactory());
    this.engineImpl.registerInstanceFactory(new PintuEntrancePortFactory());
    this.engineImpl.registerInstanceFactory(new LinkInstanceFactory());
    this.engineImpl.registerNodeFactory(new PintuNodeWidgetFactory());
    this.engineImpl.registerLinkFactory(new DefaultLinkFactory());
    
    this.diagramModel = new DiagramModel();
    this.engineImpl.setDiagramModel(this.diagramModel);
    this.hasSynced = false;
  }

  static getEngine(flow: IFlow): FlowEngine {
    const {id} = flow;
    if (!FlowEngine.engines[id]) {
      const newEngine = new FlowEngine(id);
      FlowEngine.engines[id] = new FlowEngine(id);
    }
    return FlowEngine.engines[id];
  }

  getDiagramEngine(): SRDDiagramEngine {
    return this.diagramEngine;
  }

  getDiagramModel(): DiagramModel {
    return this.diagramModel;
  }

  static setRegistry(registry: ContainerRegistry) {
    if (registry !== FlowEngine.registry) {
      // If this is a new registry, the views will change. The existing
      // engines will probably be obsolete.
      FlowEngine.engines = {};
      FlowEngine.registry = registry;
    }
  }

  private buildNode(step: IStepConfig) {
    const container = FlowEngine.registry.getContainer(step.containerName);
    const node = new PintuNodeModel(step, container);
    // TODO position the node if not automatically positioned.
    return node;
  }

  getNodeRef(data: string | PortModel): PintuNodeModel {
    if (!data) {
      throw new TypeError('Unable to get node from empty data');
    }

    if (typeof data === 'string') {
      const result = this.stepNodes[data];
      if (!result) {
        throw new TypeError(`Node for step with ID - ${data} not found`);
      }
      return result;
    } else {
      return data.getParent() as PintuNodeModel;  
    }
  }

  /**
   * @returns true if the step is inserted; false otherwise
   */
  insertStep(step: IStepConfig): boolean {
    if (!this.stepNodes[step.id]) {
      const node = this.buildNode(step);
      this.stepNodes[step.id] = node;
      this.diagramModel.addNode(node);
      return true;
    } else {
      return false;
    }
  }

  restoreLinks(destNode: PintuNodeModel) {
    _.forEach(this.stepNodes, (node) => {
      Object.keys(node.config.destinations).forEach((actionName: string) => {
        node.tryRestoreLink(actionName, destNode, this.diagramModel);
      });
    });
  }

  private restoreFlow(flow: IFlow) {
    if (this.hasSynced) {
      return;
    }

    const {
      steps,
      serializedDiagram,
    } = flow;
    if (serializedDiagram) {
      // This only adds the nodes to the diagramModel, not FlowEngine.
      // So get the nodes from the model and set to the engine.
      this.diagramModel.deSerializeDiagram(
        JSON.parse(serializedDiagram), 
        this.engineImpl
      );
      this.stepNodes = 
        this.diagramModel.getNodes() as {[key: string]: PintuNodeModel};
      // Links are restored by the engine, no need to call this.restoreLinks.
    } else {
      _.forEach(steps, (step) => {
        this.insertStep(step);
      });
      _.forEach(this.stepNodes, (step) => {
        this.restoreLinks(step);
      });
    }
    this.diagramEngine.repaintCanvas();
    this.hasSynced = true;
  }

  syncFlow(flow: IFlow, dispatch: Dispatch<any>) {
    this.restoreFlow(flow);
  }

  repaintCanvas() {
    this.diagramEngine.repaintCanvas();
  }
}