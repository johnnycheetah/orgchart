import React from "react";
import {
  Diagram,
  BoxContainer,
  LinearLayoutStrategy,
  StackingLayoutStrategy,
  MultiLineFishboneLayoutStrategy,
  SingleColumnLayoutStrategy,
  BranchParentAlignment,
  StackOrientation,
  LayoutState,
  Node,
  Size,
  LayoutAlgorithm,
  MultiLineHangerLayoutStrategy,
  FishboneAssistantsLayoutStrategy,
  IChartDataSource,
  IChartDataItem,
  LayoutStrategyBase,
} from "./core";

const NOOP_SIZE = new Size(5, 5);

export interface SimpleRect {
  top: number;
  left: number;
  height: number;
  width: number;
}

export interface CSSRect {
  top: number;
  left: number;
  height: number | string;
  width: number | string;
}

export interface BoundaryRect extends SimpleRect {
  branchTop: number;
  branchLeft: number;
}

export interface LineRenderContext<T> {
  rect: CSSRect;
  direction: "vertical" | "horizontal";
  assistant: boolean;
  data: T;
  dataId: string;
  boxId: number;
  index: number;
}

export interface NodeRenderContext<T> {
  rect: CSSRect;
  data: T;
  assistant: boolean;
  dataId: string;
  boxId: number;
}

export interface NodeContainerRenderContext<T> {
  hidden: boolean;
}

export interface NodeLineRenderContext<T> {
  hidden: boolean;
  direction: LineRenderContext<T>["direction"];
}

export type LayoutType =
  | "linear"
  | "smart"
  | "fishbone1"
  | "fishbone2"
  | "singleColumnRight"
  | "singleColumnLeft"
  | "stackers";

interface OrgChartDataItem<T> extends IChartDataItem {
  data: T;
  parentKey: string | null;
}

class OrgChartDiagram<T> extends Diagram {
  DataSource: IChartDataSource<OrgChartDataItem<T>>;

  constructor(dataSource: IChartDataSource<OrgChartDataItem<T>>) {
    super();

    this.DataSource = dataSource;
  }
}

export type NodeContainerRenderProps<T> = {
  "data-box-id": string;
  key: string;
  style: React.CSSProperties;
  children: React.ReactNode;
};

export type NodeLineRenderProps<T> = {
  "data-line-assistant": boolean;
  "data-line-direction": LineRenderContext<T>["direction"];
  className?: string;
  style: React.CSSProperties;
  key: string;
};

export type AssistantLayoutType = LayoutType | "assistants";

interface OrgChartProps<T> {
  root: T;
  keyGetter: (node: T) => string;
  childNodesGetter: (node: T) => T[];
  isAssistantGetter?: (node: T) => boolean;
  lineVerticalClassName?: string;
  lineHorizontalClassName?: string;
  lineVerticalStyle?: React.CSSProperties;
  lineHorizontalStyle?: React.CSSProperties;
  layout?: LayoutType | LayoutStrategyBase;
  assistantLayout?: AssistantLayoutType | LayoutStrategyBase;
  containerStyle?: React.CSSProperties;
  nodeContainerStyle?: React.CSSProperties;
  isValidNode: (id: string) => boolean;
  renderNode: (node: T) => React.ReactElement;
  renderNodeContainer?: (
    node: T,
    props: NodeContainerRenderProps<T>,
    context: NodeContainerRenderContext<T>
  ) => React.ReactElement;
  renderNodeLine?: (
    node: T,
    props: NodeLineRenderProps<T>,
    context: NodeLineRenderContext<T>
  ) => React.ReactElement;
  parentSpacing?: number;
  siblingSpacing?: number;
  debug?: boolean;
}

interface OrgChartState<T> {
  lines: LineRenderContext<T>[];
  width: number;
  height: number;
  diagram: OrgChartDiagram<T> | null;
  nodes: NodeRenderContext<T>[];
  hidden: boolean;
  boundaries: BoundaryRect[];
  prevProps: OrgChartProps<T> | null;
  renderIndex: number;
}

export default class OrgChart<T> extends React.Component<
  OrgChartProps<T>,
  OrgChartState<T>
> {
  state: OrgChartState<T> = {
    lines: Array<LineRenderContext<T>>(),
    width: 0,
    height: 0,
    diagram: null,
    nodes: [],
    hidden: true,
    boundaries: [],
    prevProps: null,
    renderIndex: 0,
  };

  private _mounted: boolean = true;
  private _container: React.RefObject<HTMLDivElement> = React.createRef();

  private static assignStrategies(diagram: Diagram): LayoutStrategyBase[] {
    const strategies: LayoutStrategyBase[] = [];

    let strategy: LayoutStrategyBase;

    strategy = new LinearLayoutStrategy();
    strategy.ParentAlignment = BranchParentAlignment.Center;
    diagram.LayoutSettings.LayoutStrategies.set("linear", strategy);

    strategies.push(strategy);

    strategy = new MultiLineHangerLayoutStrategy();
    strategy.ParentAlignment = BranchParentAlignment.Center;
    (strategy as MultiLineHangerLayoutStrategy).MaxSiblingsPerRow = 2;
    diagram.LayoutSettings.LayoutStrategies.set("hanger2", strategy);

    strategies.push(strategy);

    strategy = new MultiLineHangerLayoutStrategy();
    strategy.ParentAlignment = BranchParentAlignment.Center;
    (strategy as MultiLineHangerLayoutStrategy).MaxSiblingsPerRow = 4;
    diagram.LayoutSettings.LayoutStrategies.set("hanger4", strategy);

    strategies.push(strategy);

    strategy = new SingleColumnLayoutStrategy();
    strategy.ParentAlignment = BranchParentAlignment.Right;
    diagram.LayoutSettings.LayoutStrategies.set("singleColumnRight", strategy);

    strategies.push(strategy);

    strategy = new SingleColumnLayoutStrategy();
    strategy.ParentAlignment = BranchParentAlignment.Left;
    diagram.LayoutSettings.LayoutStrategies.set("singleColumnLeft", strategy);

    strategies.push(strategy);

    strategy = new MultiLineFishboneLayoutStrategy();
    strategy.ParentAlignment = BranchParentAlignment.Center;
    (strategy as MultiLineFishboneLayoutStrategy).MaxGroups = 1;
    diagram.LayoutSettings.LayoutStrategies.set("fishbone1", strategy);

    strategies.push(strategy);

    strategy = new MultiLineFishboneLayoutStrategy();
    strategy.ParentAlignment = BranchParentAlignment.Center;
    (strategy as MultiLineFishboneLayoutStrategy).MaxGroups = 2;
    diagram.LayoutSettings.LayoutStrategies.set("fishbone2", strategy);

    strategies.push(strategy);

    strategy = new StackingLayoutStrategy();
    strategy.ParentAlignment = BranchParentAlignment.InvalidValue;
    (strategy as StackingLayoutStrategy).Orientation =
      StackOrientation.SingleRowHorizontal;
    strategy.ParentChildSpacing = 10;
    diagram.LayoutSettings.LayoutStrategies.set("hstack", strategy);

    strategies.push(strategy);

    strategy = new StackingLayoutStrategy();
    strategy.ParentAlignment = BranchParentAlignment.InvalidValue;
    (strategy as StackingLayoutStrategy).Orientation =
      StackOrientation.SingleColumnVertical;
    strategy.ParentChildSpacing = 10;
    diagram.LayoutSettings.LayoutStrategies.set("vstack", strategy);

    strategies.push(strategy);

    strategy = new StackingLayoutStrategy();
    strategy.ParentAlignment = BranchParentAlignment.InvalidValue;
    (strategy as StackingLayoutStrategy).Orientation =
      StackOrientation.SingleColumnVertical;
    strategy.SiblingSpacing = 20;
    diagram.LayoutSettings.LayoutStrategies.set("vstackMiddle", strategy);

    strategies.push(strategy);

    strategy = new StackingLayoutStrategy();
    strategy.ParentAlignment = BranchParentAlignment.InvalidValue;
    (strategy as StackingLayoutStrategy).Orientation =
      StackOrientation.SingleColumnVertical;
    strategy.SiblingSpacing = 50;
    diagram.LayoutSettings.LayoutStrategies.set("vstackTop", strategy);

    strategies.push(strategy);

    strategy = new FishboneAssistantsLayoutStrategy();
    strategy.ParentAlignment = BranchParentAlignment.Center;
    diagram.LayoutSettings.LayoutStrategies.set("assistants", strategy);

    strategies.push(strategy);

    diagram.LayoutSettings.DefaultLayoutStrategyId = "vstack";
    diagram.LayoutSettings.DefaultAssistantLayoutStrategyId = "assistants";

    return strategies;
  }

  private static getDataSource<T>(
    props: OrgChartProps<T>
  ): IChartDataSource<OrgChartDataItem<T>> {
    const { root, childNodesGetter, keyGetter, isAssistantGetter } = props;

    const items: Map<string, OrgChartDataItem<T>> = new Map();
    const sortedKeys: string[] = [];
    const processNode = (node: T, parentKey: string | null = null) => {
      const key = keyGetter(node);

      if (process.env.NODE_ENV !== "production") {
        if (!key) {
          throw Error("Invalid key");
        }

        if (items.has(key)) {
          throw Error("Duplicate key");
        }
      }

      sortedKeys.push(key);

      const emphasized = isAssistantGetter ? isAssistantGetter(node) : false;

      items.set(key, {
        IsAssistant: emphasized,
        Id: key,
        data: node,
        parentKey,
      });

      for (const childNode of childNodesGetter(node)) {
        processNode(childNode, key);
      }
    };

    processNode(root, null);

    const getDataItem = (id: string) => {
      const item = items.get(id);

      if (item == null) {
        throw Error("Could not find item");
      }

      return item;
    };

    return {
      GetDataItemFunc: (id: string) => getDataItem(id),
      GetParentKeyFunc: (id: string) => items.get(id)?.parentKey || null,
      AllDataItemIds: sortedKeys,
    };
  }

  private static getBranchOptimizerStackers(node: Node): string | null {
    if (node.IsAssistantRoot) {
      return null;
    }
    return node.Level === 0 // this is Node for boxContainer.SystemRoot, which is not visible itself
      ? "vstackTop"
      : node.Level === 1 // this is children of SystemRoot - they appear as roots in the diagram
      ? "vstackMiddle"
      : "hstack";
  }

  private static getBranchOptimizerSmart(node: Node): string | null {
    if (node.IsAssistantRoot) {
      return null;
    }

    let childCount = node.ChildCount;

    if (childCount <= 1) {
      return "vstack";
    }

    let nonLeafChildren = 0;
    for (let i = 0; i < childCount; i++) {
      if (node.Children[i].ChildCount > 0) {
        nonLeafChildren++;
      }
    }

    if (nonLeafChildren <= 1) {
      if (childCount <= 4) {
        return "vstack";
      }
      if (childCount <= 8) {
        return "fishbone1";
      }
      return "fishbone2";
    }

    return "hanger4";
  }

  componentWillUnmount() {
    this._mounted = true;
  }

  static getDerivedStateFromProps<T>(
    props: OrgChartProps<T>,
    state: OrgChartState<T>
  ): Partial<OrgChartState<T>> {
    if (props !== state.prevProps) {
      const diagram = OrgChart.createDiagram(props);
      const placeholders = OrgChart.getPlaceholders(diagram, state.nodes);

      return {
        diagram,
        ...placeholders,
        prevProps: props,
        renderIndex: state.renderIndex + 1,
      };
    }

    return { prevProps: props };
  }

  componentWillMount() {
    const nextState = OrgChart.getDerivedStateFromProps(this.props, this.state);

    // @ts-ignore
    this.setState(nextState);
  }

  componentWillReceiveProps(nextProps: OrgChartProps<T>) {
    if (nextProps !== this.props) {
      const nextState = OrgChart.getDerivedStateFromProps(
        nextProps,
        this.state
      );

      // @ts-ignore
      this.setState(nextState);
    }
  }

  private static createDiagram<T>(props: OrgChartProps<T>) {
    const {
      layout,
      assistantLayout,
      parentSpacing = 40,
      siblingSpacing = 30,
    } = props;

    const dataSource = OrgChart.getDataSource(props);
    const boxContainer = new BoxContainer(dataSource);
    const diagram = new OrgChartDiagram<T>(dataSource);

    diagram.Boxes = boxContainer;

    const strategies = OrgChart.assignStrategies(diagram);

    if (layout instanceof LayoutStrategyBase) {
      diagram.LayoutSettings.LayoutStrategies.set("custom", layout);
    }

    if (assistantLayout instanceof LayoutStrategyBase) {
      diagram.LayoutSettings.LayoutStrategies.set(
        "assistantCustom",
        assistantLayout
      );
    }

    for (const strategy of strategies) {
      strategy.ChildConnectorHookLength = parentSpacing / 2;
      strategy.ParentChildSpacing = parentSpacing;
      strategy.SiblingSpacing = siblingSpacing;
    }

    return diagram;
  }

  private onComputeBranchOptimizer = (node: Node): string | null => {
    const { layout = "linear" } = this.props;

    if (node.IsAssistantRoot) {
      const { assistantLayout = "assistants" } = this.props;

      if (assistantLayout instanceof LayoutStrategyBase) {
        return "assistantCustom";
      } else {
        return assistantLayout;
      }
    } else if (layout === "smart") {
      return OrgChart.getBranchOptimizerSmart(node);
    } else if (layout === "stackers") {
      return OrgChart.getBranchOptimizerStackers(node);
    } else if (layout instanceof LayoutStrategyBase) {
      return "custom";
    } else {
      return layout;
    }
  };

  private static getPlaceholders<T>(
    diagram: OrgChartDiagram<T>,
    prevNodes: NodeRenderContext<T>[]
  ) {
    const dataSource = diagram.DataSource;
    const nodes: NodeRenderContext<T>[] = [];
    const prevNodesByDataId = new Map<string, NodeRenderContext<T>>();

    for (const node of prevNodes) {
      prevNodesByDataId.set(node.dataId, node);
    }

    const DEFAULT_RECT: CSSRect = {
      left: 0,
      top: 0,
      // unused
      width: "",
      height: "",
    };

    for (const box of diagram.Boxes.BoxesById.values()) {
      if (!box.IsDataBound) {
        continue;
      }

      const id = box.Id;
      const dataId = box.DataId || "";
      const data = dataSource.GetDataItemFunc(dataId).data;
      const prevNode = prevNodesByDataId.get(dataId);
      const nextRect = prevNode?.rect || DEFAULT_RECT;

      nodes.push({
        rect: {
          left: nextRect.left,
          top: nextRect.top,
          width: "auto",
          height: "auto",
        },
        data,
        dataId: box.DataId || String(id),
        boxId: id,
        assistant: box.IsAssistant,
      });
    }

    nodes.sort((a, b) => a.boxId - b.boxId);

    return { hidden: true, nodes };
  }

  private _lastRenderIndex: number = 0;
  private safelyDrawDiagram() {
    if (this.props !== this.state.prevProps) {
      // this.setState({});
      return;
    }

    if (!this._mounted) {
      return;
    }

    const { diagram, renderIndex } = this.state;
    const { debug } = this.props;

    if (renderIndex > this._lastRenderIndex) {
      this._lastRenderIndex = renderIndex;

      if (diagram) {
        this.drawDiagram(diagram, debug);
      }
    }
  }

  componentDidMount() {
    this.safelyDrawDiagram();
  }

  componentDidUpdate() {
    this.safelyDrawDiagram();
  }

  private drawDiagram(diagram: OrgChartDiagram<T>, debug?: boolean) {
    if (diagram !== this.state.diagram) {
      return;
    }

    if (diagram.DataSource.AllDataItemIds.length === 0) {
      return;
    }

    const state = new LayoutState(diagram);
    const nodeMap: Map<number, HTMLDivElement> = new Map();
    const container: HTMLDivElement | null = this._container.current;

    if (container) {
      container.querySelectorAll("[data-box-id]").forEach((node: Element) => {
        const id = node.getAttribute("data-box-id");

        if (id) {
          nodeMap.set(parseInt(id), node as HTMLDivElement);
        }
      });
    }

    // state.OperationChanged = this.onLayoutStateChanged;
    state.LayoutOptimizerFunc = this.onComputeBranchOptimizer;
    state.BoxSizeFunc = (dataId: string | null) => {
      if (dataId == null) {
        return NOOP_SIZE;
      }

      const box = diagram.Boxes.BoxesByDataId.get(dataId);

      if (box) {
        const element = nodeMap.get(box.Id);

        if (element) {
          // force recalculate
          void element.offsetWidth;
          void element.offsetHeight;

          const rect = element.getBoundingClientRect();

          return new Size(rect.width, rect.height);
        }
      }

      return NOOP_SIZE;
    };

    LayoutAlgorithm.Apply(state);

    if (diagram.VisualTree == null) {
      throw Error("VisualTree is null");
    }

    const diagramBoundary = LayoutAlgorithm.ComputeBranchVisualBoundingRect(
      diagram.VisualTree
    );

    const offsetX = -diagramBoundary.Left;
    const offsetY = -diagramBoundary.Top;

    const nodes: NodeRenderContext<T>[] = [];
    const lines: LineRenderContext<T>[] = [];
    const boundaries: BoundaryRect[] = [];

    diagram.VisualTree.IterateParentFirst((node: Node) => {
      if (node.State.IsHidden) {
        return false;
      }

      const box = node.Element;

      if (!box.IsDataBound) {
        return true;
      }

      // All boxes have already been rendered before the chart layout,
      // to have all box sizes available before layout.
      // So now we only have to position them.
      // Connectors, however, are not rendered until layout is complete (see next block).

      const x = node.State.TopLeft.X + offsetX;
      const y = node.State.TopLeft.Y + offsetY;
      const dataId = box.DataId || "";
      const { data } = diagram.DataSource.GetDataItemFunc(dataId);

      nodes.push({
        rect: {
          left: x,
          top: y,
          width: box.Size.Width,
          height: box.Size.Height,
        },
        data,
        dataId: dataId || String(box.Id),
        boxId: box.Id,
        assistant: box.IsAssistant,
      });

      if (debug) {
        boundaries.push({
          branchLeft: node.State.BranchExterior.Left,
          branchTop: node.State.BranchExterior.Top,
          left: node.State.BranchExterior.Left + offsetX,
          top: node.State.BranchExterior.Top + offsetY,
          width: node.State.BranchExterior.Size.Width,
          height: node.State.BranchExterior.Size.Height,
        });
      }

      // Render connectors
      if (node.State.Connector != null) {
        const segments = node.State.Connector.Segments;

        for (let ix = 0; ix < segments.length; ix++) {
          const edge = segments[ix];
          let direction: "horizontal" | "vertical" = "horizontal";
          let assistant = box.IsAssistant;
          let topLeft;
          let width = 0;
          let height = 0;

          if (edge.From.Y === edge.To.Y) {
            direction = "horizontal";
            height = 1;
            if (edge.From.X < edge.To.X) {
              topLeft = edge.From;
              width = edge.To.X - edge.From.X;
            } else {
              topLeft = edge.To;
              width = edge.From.X - edge.To.X;
            }
          } else {
            direction = "vertical";
            if (edge.From.Y < edge.To.Y) {
              topLeft = edge.From;
              height = edge.To.Y - edge.From.Y;
            } else {
              topLeft = edge.To;
              height = edge.From.Y - edge.To.Y;
            }
          }

          lines.push({
            direction,
            assistant,
            data,
            dataId,
            boxId: box.Id,
            index: ix,
            rect: {
              left: topLeft.X + offsetX,
              top: topLeft.Y + offsetY,
              width,
              height,
            },
          });
        }
      }

      return true;
    });

    this.setState({
      width: diagramBoundary.Size.Width,
      height: diagramBoundary.Size.Height,
      lines,
      nodes,
      boundaries,
      hidden: false,
    });
  }

  render() {
    const {
      lines,
      width: containerWidth,
      height: containerHeight,
      nodes,
      hidden,
      boundaries,
    } = this.state;

    const {
      lineVerticalClassName,
      lineHorizontalClassName,
      lineHorizontalStyle,
      lineVerticalStyle,
      containerStyle,
      renderNode,
      renderNodeContainer,
      renderNodeLine,
      nodeContainerStyle,
      isValidNode,
    } = this.props;

    const lineClassNames: Record<
      LineRenderContext<T>["direction"],
      string | undefined
    > = {
      vertical: lineVerticalClassName,
      horizontal: lineHorizontalClassName,
    };

    const lineStyles: Record<
      LineRenderContext<T>["direction"],
      React.CSSProperties | undefined
    > = {
      vertical: lineVerticalStyle,
      horizontal: lineHorizontalStyle,
    };

    return (
      <div
        style={{
          width: containerWidth,
          height: containerHeight,
          position: "relative",
          ...containerStyle,
        }}
        ref={this._container}
      >
        <div>
          {lines.map(
            ({
              rect: { width, height, left, top },
              data,
              assistant,
              direction,
              dataId,
              index,
            }) => {
              const isValid = isValidNode(dataId);

              if (!isValid) {
                return null;
              }

              const props: NodeLineRenderProps<T> = {
                "data-line-assistant": assistant,
                "data-line-direction": direction,
                className: lineClassNames[direction],
                key: dataId + "-" + index,
                style: {
                  left: 0,
                  top: 0,
                  width,
                  height,
                  transform: `translate3d(${left}px, ${top}px, 0)`,
                  position: "absolute",
                  ...lineStyles[direction],
                },
              };

              if (typeof renderNodeLine === "function") {
                return renderNodeLine(data, props, { hidden, direction });
              }

              // props.style = { ...props.style };
              props.style.visibility = hidden ? "hidden" : "visible";
              props.style.pointerEvents = hidden ? "none" : "auto";

              return <div {...props} />;
            }
          )}
        </div>
        <div>
          {nodes.map((context) => {
            const {
              rect: { top, left, width, height },
              dataId,
              boxId: dataBoxId,
              data,
            } = context;

            const isValid = isValidNode(dataId);

            if (!isValid) {
              return null;
            }

            const children = renderNode(data);
            const props: NodeContainerRenderProps<T> = {
              "data-box-id": String(dataBoxId),
              children,
              key: dataId,
              style: {
                left: 0,
                top: 0,
                transform: `translate3d(${left}px, ${top}px, 0)`,
                position: "absolute",
                ...nodeContainerStyle,
              },
            };

            if (typeof renderNodeContainer === "function") {
              return renderNodeContainer(data, props, { hidden });
            }

            // props.style = { ...props.style };
            props.style.visibility = hidden ? "hidden" : "visible";
            props.style.pointerEvents = hidden ? "none" : "auto";

            return <div {...props} />;
          })}
        </div>
        <div>
          {boundaries.map(
            ({ top, left, width, height, branchLeft, branchTop }, i) => {
              return (
                <div
                  key={i}
                  style={{
                    transform: `translate3d(${left}px, ${top}px, 0)`,
                    width,
                    height,
                    position: "absolute",
                    top: 0,
                    left: 0,
                    zIndex: 0,
                    pointerEvents: "none",
                    visibility: hidden ? "hidden" : "visible",
                    background: "rgba(255,0,0,0.1)",
                    border: "1px solid red",
                  }}
                >
                  <div
                    style={{
                      backgroundColor: "red",
                      color: "white",
                      display: "inline-block",
                      padding: "0 2px",
                    }}
                  >
                    ({+branchLeft.toFixed(2)},{+branchTop.toFixed(2)}){" "}
                    {+width.toFixed(2)}x{+height.toFixed(2)}
                  </div>
                </div>
              );
            }
          )}
        </div>
      </div>
    );
  }
}
