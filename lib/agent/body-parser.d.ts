import { ContentType, SupportedContentType } from "./type";
declare class BodyParser {
    private _contentType?;
    constructor(contentType?: ContentType | SupportedContentType);
    marshal(body: any): BodyInit | null | undefined;
}
export default BodyParser;
