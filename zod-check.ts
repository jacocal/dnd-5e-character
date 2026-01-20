import { z } from 'zod';

const schema = z.string();
const result = schema.safeParse(123);

if (!result.success) {
    // Check if .issues exists
    console.log("Issues:", result.error.issues);
    // Check if .errors exists (should fail compilation if not present, but here we run it)
    console.log("Errors:", (result.error as any).errors);
}
