```typescript
import "reflect-metadata";

// Tipos
interface RequestContext {
  request: Request;
  params?: Record<string, string>;
}

// Chaves para metadados
const ROUTE_KEY = Symbol("route");
const PARAM_METADATA_KEY = Symbol("paramMetadata");

// Enum para tipos de parâmetros
enum ParamType {
  BODY = "body",
  QUERY = "query",
  PARAM = "param",
  HEADER = "header",
  REQUEST = "request",
}

// Decorator para definir rotas
function POST(path: string) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    Reflect.defineMetadata(
      ROUTE_KEY,
      { method: "POST", path },
      target,
      propertyKey
    );
    return descriptor;
  };
}

function GET(path: string) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    Reflect.defineMetadata(
      ROUTE_KEY,
      { method: "GET", path },
      target,
      propertyKey
    );
    return descriptor;
  };
}

// Função auxiliar para registrar metadados de parâmetros
function setParamMetadata(
  target: any,
  propertyKey: string | symbol,
  parameterIndex: number,
  type: ParamType,
  key?: string
) {
  const existingParams =
    Reflect.getOwnMetadata(PARAM_METADATA_KEY, target, propertyKey) || [];
  existingParams.push({ index: parameterIndex, type, key });
  Reflect.defineMetadata(
    PARAM_METADATA_KEY,
    existingParams,
    target,
    propertyKey
  );
}

// Decorators de parâmetros
function BODY() {
  return function (
    target: any,
    propertyKey: string | symbol,
    parameterIndex: number
  ) {
    setParamMetadata(target, propertyKey, parameterIndex, ParamType.BODY);
  };
}

function QUERY(key?: string) {
  return function (
    target: any,
    propertyKey: string | symbol,
    parameterIndex: number
  ) {
    setParamMetadata(target, propertyKey, parameterIndex, ParamType.QUERY, key);
  };
}

function PARAM(key: string) {
  return function (
    target: any,
    propertyKey: string | symbol,
    parameterIndex: number
  ) {
    setParamMetadata(target, propertyKey, parameterIndex, ParamType.PARAM, key);
  };
}

function HEADER(key: string) {
  return function (
    target: any,
    propertyKey: string | symbol,
    parameterIndex: number
  ) {
    setParamMetadata(
      target,
      propertyKey,
      parameterIndex,
      ParamType.HEADER,
      key
    );
  };
}

function REQUEST() {
  return function (
    target: any,
    propertyKey: string | symbol,
    parameterIndex: number
  ) {
    setParamMetadata(target, propertyKey, parameterIndex, ParamType.REQUEST);
  };
}

// Função para processar os parâmetros
async function processParameters(
  context: RequestContext,
  target: any,
  propertyKey: string
): Promise<any[]> {
  const paramMetadata =
    Reflect.getOwnMetadata(PARAM_METADATA_KEY, target, propertyKey) || [];
  const paramTypes =
    Reflect.getMetadata("design:paramtypes", target, propertyKey) || [];

  const args: any[] = new Array(paramTypes.length);

  for (const metadata of paramMetadata) {
    const { index, type, key } = metadata;

    switch (type) {
      case ParamType.BODY:
        try {
          const contentType = context.request.headers.get("content-type") || "";
          if (contentType.includes("application/json")) {
            args[index] = await context.request.json();
          } else if (
            contentType.includes("application/x-www-form-urlencoded")
          ) {
            const formData = await context.request.formData();
            args[index] = Object.fromEntries(formData.entries());
          } else {
            args[index] = await context.request.text();
          }
        } catch (e) {
          args[index] = null;
        }
        break;

      case ParamType.QUERY:
        const url = new URL(context.request.url);
        if (key) {
          args[index] = url.searchParams.get(key);
        } else {
          args[index] = Object.fromEntries(url.searchParams.entries());
        }
        break;

      case ParamType.PARAM:
        args[index] = context.params?.[key!];
        break;

      case ParamType.HEADER:
        args[index] = context.request.headers.get(key!);
        break;

      case ParamType.REQUEST:
        args[index] = context.request;
        break;
    }
  }

  return args;
}

// Wrapper para executar métodos do controller
async function executeController(
  instance: any,
  methodName: string,
  context: RequestContext
): Promise<Response> {
  const args = await processParameters(context, instance, methodName);
  const result = await instance[methodName](...args);

  return new Response(JSON.stringify(result), {
    headers: { "Content-Type": "application/json" },
  });
}

// ============================================
// EXEMPLO DE USO - Controller
// ============================================

class UserController {
  @Post("/users")
  async createUser(@BODY() data: any) {
    console.log("Body recebido:", data);
    return {
      success: true,
      user: {
        id: Math.random(),
        ...data,
      },
    };
  }

  @Get("/users/:id")
  async getUser(@PARAM("id") id: string, @QUERY("include") include?: string) {
    console.log("ID:", id);
    console.log("Include:", include);
    return {
      user: {
        id,
        name: "João Silva",
        include,
      },
    };
  }

  @Post("/users/:id/update")
  async updateUser(
    @PARAM("id") id: string,
    @BODY() data: any,
    @HEADER("authorization") auth: string
  ) {
    console.log("Atualizando user:", id);
    console.log("Dados:", data);
    console.log("Auth:", auth);
    return {
      success: true,
      updated: { id, ...data },
    };
  }

  @Get("/search")
  async search(@QUERY() queryParams: Record<string, string>) {
    console.log("Query params:", queryParams);
    return { results: [], query: queryParams };
  }

  @Post("/raw-request")
  async rawRequest(@REQUEST() request: Request) {
    console.log("URL:", request.url);
    console.log("Method:", request.method);
    return { received: true };
  }
}

// ============================================
// SIMULAÇÃO DE CHAMADAS
// ============================================

async function simulateRequests() {
  const controller = new UserController();

  console.log("=== 1. POST /users (criar usuário) ===");
  const createContext: RequestContext = {
    request: new Request("http://localhost/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "João", email: "joao@email.com" }),
    }),
  };
  const response1 = await executeController(
    controller,
    "createUser",
    createContext
  );
  console.log(await response1.text());

  console.log("\n=== 2. GET /users/123?include=posts ===");
  const getContext: RequestContext = {
    request: new Request("http://localhost/users/123?include=posts", {
      method: "GET",
    }),
    params: { id: "123" },
  };
  const response2 = await executeController(controller, "getUser", getContext);
  console.log(await response2.text());

  console.log("\n=== 3. POST /users/456/update ===");
  const updateContext: RequestContext = {
    request: new Request("http://localhost/users/456/update", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer token123",
      },
      body: JSON.stringify({ name: "Maria", age: 30 }),
    }),
    params: { id: "456" },
  };
  const response3 = await executeController(
    controller,
    "updateUser",
    updateContext
  );
  console.log(await response3.text());

  console.log("\n=== 4. GET /search?q=nodejs&limit=10 ===");
  const searchContext: RequestContext = {
    request: new Request("http://localhost/search?q=nodejs&limit=10", {
      method: "GET",
    }),
  };
  const response4 = await executeController(
    controller,
    "search",
    searchContext
  );
  console.log(await response4.text());
}

// Executar simulações
simulateRequests();
```
