import { _decorator, Node, Label, Color, BitmapFont, IAssembler, RenderData, UIVertexFormat, Vec3, Mat4 } from 'cc';
const { ccclass, property, menu } = _decorator;

@ccclass('ColorLabel')
@menu('UI/ColorLabel')
export class ColorLabel extends Label {

    public static colorBmfont: IAssembler = null;

    @property({
        displayOrder: 2,
        tooltip: 'i18n:labelOutline.color',
        visible: function (this: ColorLabel) {
            return this.font instanceof BitmapFont;
        }
    })
    get outlineColor (): Readonly<Color> {
        return this._outlineColor;
    }
    set outlineColor (value) {
        if (this._outlineColor.equals(value)) {
            return;
        }
        this._outlineColor.set(value);
    }

    @property(Color)
    private _outlineColor: Color = Color.BLACK.clone();

    protected _flushAssembler() {
        let assembler = Label.Assembler.getAssembler(this);

        if (this.font instanceof BitmapFont) {
            assembler = ColorLabel.colorBmfont;
        }

        if (this._assembler !== assembler) {
            this.destroyRenderData();
            this._assembler = assembler;
        }

        if (!this._renderData) {
            if (this._assembler && this._assembler.createData) {
                this._renderData = this._assembler.createData(this);
                this._renderData!.material = this.material;
            }
        }
    }
}

// ColorLabel Assembler
const tempColor = new Color(255, 255, 255, 255);
const tempColor2 = new Color(255, 255, 255, 255);

if (ColorLabel.colorBmfont === null) {
    function getPropertyDescriptor (object: any, propertyName: string) {
        while (object) {
            const pd = Object.getOwnPropertyDescriptor(object, propertyName);
            if (pd) {
                return pd;
            }
            object = Object.getPrototypeOf(object);
        }
        return null;
    }

    function copyAssembler(target: any, source: any) {
        for (const name in source) {
            const pd = getPropertyDescriptor(source, name);
            if (pd) {
                Object.defineProperty(target, name, pd);
            }
        }
    }

    const colorBmfont: IAssembler = {};
    // @ts-ignore
    copyAssembler(colorBmfont, Label.Assembler.getAssembler({ font: new BitmapFont }));
    // const colorBmfont = Label.Assembler.getAssembler({ font: new BitmapFont });
    ColorLabel.colorBmfont = colorBmfont;

    colorBmfont.createData = (comp: ColorLabel) => {
        return RenderData.add(UIVertexFormat.vfmtPosUvTwoColor);
    }

    colorBmfont.fillBuffers =  (comp: ColorLabel) => {
        const node = comp.node;
        tempColor.set(comp.color);
        tempColor2.set(comp.outlineColor);
        tempColor.a = node._uiProps.opacity * 255;
        // Fill All
        fillMeshVertices3D(node, comp.renderData!, tempColor, tempColor2);
    }

    const vec3_temp = new Vec3();
    const _worldMatrix = new Mat4();

    function fillMeshVertices3D (node: Node, renderData: RenderData, color: Color, color2: Color) {
        const chunk = renderData.chunk;
        const dataList = renderData.data;
        const vData = chunk.vb;
        const vertexCount = renderData.vertexCount;

        node.getWorldMatrix(_worldMatrix);

        let vertexOffset = 0;
        for (let i = 0; i < vertexCount; i++) {
            const vert = dataList[i];
            Vec3.set(vec3_temp, vert.x, vert.y, 0);
            Vec3.transformMat4(vec3_temp, vec3_temp, _worldMatrix);
            vData[vertexOffset++] = vec3_temp.x;
            vData[vertexOffset++] = vec3_temp.y;
            vData[vertexOffset++] = vec3_temp.z;
            vData[vertexOffset++] = vert.u;
            vData[vertexOffset++] = vert.v;
            Color.toArray(vData, color, vertexOffset);
            Color.toArray(vData, color2, vertexOffset + 4);
            vertexOffset += 8;
        }

        // fill index data
        const bid = chunk.bufferId;
        const vid = chunk.vertexOffset;
        const meshBuffer = chunk.vertexAccessor.getMeshBuffer(chunk.bufferId);
        const ib = chunk.vertexAccessor.getIndexBuffer(bid);
        let indexOffset = meshBuffer.indexOffset;
        for (let i = 0, count = vertexCount / 4; i < count; i++) {
            const start = vid + i * 4;
            ib[indexOffset++] = start;
            ib[indexOffset++] = start + 1;
            ib[indexOffset++] = start + 2;
            ib[indexOffset++] = start + 1;
            ib[indexOffset++] = start + 3;
            ib[indexOffset++] = start + 2;
        }
        meshBuffer.indexOffset += renderData.indexCount;
        meshBuffer.setDirty();
    }
}
