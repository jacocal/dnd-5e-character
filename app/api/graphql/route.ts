import { createYoga } from "graphql-yoga";
import { schema } from "./schema";

const yoga = createYoga({
    graphqlEndpoint: "/api/graphql",
    schema,
    fetchAPI: { Response },
    logging: "debug",
});

const handleRequest = async (request: Request, context: object) => {
    console.log(`[API Route] Received ${request.method} request to ${request.url}`);
    const response = await yoga.handleRequest(request, context);
    console.log(`[API Route] Response status: ${response.status}`);
    return response;
};

export { handleRequest as GET, handleRequest as POST };
