import { ManifestFactoy } from '@shenghuabi/sdk/server';
import neo4j from 'neo4j-driver';
import * as vscode from 'vscode';
export const GlobalAllConfig = vscode.workspace.getConfiguration('shb-neo4j.server');

const manifestFactory = (options?: any): ManifestFactoy => {
  let authConfig = GlobalAllConfig.get('auth') as Record<string, any>;
  let auth;
  if (authConfig) {
    if (authConfig.basic) {
      auth = neo4j.auth.basic(authConfig.basic.username, authConfig.basic.password, authConfig.basic.realm);
    } else if (typeof authConfig.kerberos === 'string') {
      auth = neo4j.auth.kerberos(authConfig.kerberos);
    } else if (typeof authConfig.bearer === 'string') {
      auth = neo4j.auth.bearer(authConfig.bearer);
    } else if (authConfig.custom) {
      auth = neo4j.auth.custom(
        authConfig.custom.principal,
        authConfig.custom.credentials,
        authConfig.custom.realm,
        authConfig.custom.scheme,
        authConfig.custom.parameters
      );
    }
  } else {
    auth = neo4j.auth.basic('neo4j', 'neo4j');
  }
  const driver = neo4j.driver(GlobalAllConfig.get('url')! ?? 'bolt://localhost:7687', auth);

  return (input) => {
    return {
      providers: {
        root: [],
        knowledge: [
          {
            provide: input.provider.knowledge.QdrantClientService,
            useClass: class extends input.provider.knowledge.QdrantClientService {
              createCollection(collection_name: string, args_1: any): Promise<boolean> {
                return super.createCollection(collection_name, args_1);
              }
              async upsert(
                collection_name: string,
                args_1: { wait?: boolean; ordering?: 'weak' | 'medium' | 'strong' } & {
                  points: {
                    id: string | number;
                    vector:
                      | number[]
                      | number[][]
                      | { text: string; model?: string | null }
                      | Record<
                          string,
                          | number[]
                          | number[][]
                          | { text: string; model?: string | null }
                          | { indices: number[]; values: number[] }
                          | undefined
                        >;
                    payload?: Record<string, unknown> | (Record<string, unknown> | null);
                  }[];
                  shard_key?: (string | number | (string | number)[]) | (Record<string, unknown> | null);
                }
              ): Promise<any> {
                await super.upsert(collection_name, args_1);
                if (collection_name.endsWith('-定义')) {
                  const newName = collection_name.replace(/(-|\[|])/g, '_');

                  const session = driver.session();
                  try {
                    for (const { payload } of args_1.points) {
                      if (payload!['kind'] === 'node') {
                        const result = await session.run(
                          `CREATE (p:${newName} {name: $name, description: $description,type:$type,fileName:$fileName}) RETURN p`,
                          payload
                        );
                      } else if (payload!['kind'] === 'edge') {
                        const result = await session.run(
                          `MATCH (a:${newName} {name:$source}), 
(b:${newName} {name:$target}) 
MERGE (a)-[:to {source:$source,target:$target,name:$name,description: $description}]->(b)`,
                          payload
                        );
                      }
                    }

                    await session.close();
                  } catch (error) {
                    console.log('异常', error);
                  }
                }
              }
            },
          },
        ],
      },
    };
  };
};

export default manifestFactory;
