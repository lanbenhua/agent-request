import { ContentType } from "../type";
export declare const get_response_type: (res: Response) => ContentType | undefined;
export declare const path_join: (...paths: (string | null | undefined)[]) => string;
export declare const resolve_search_params: (search?: string | undefined, data?: unknown) => string;
export declare const get_content_type: (type?: string | undefined) => string | null | undefined;
