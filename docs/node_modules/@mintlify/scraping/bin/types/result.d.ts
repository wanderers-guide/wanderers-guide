export type Result<T> = {
    success: true;
    data?: T;
} | {
    success: false;
    message: string;
    data?: T;
};
