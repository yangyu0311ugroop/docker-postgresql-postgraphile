# Docker-PostgreSQL-PostGraphile

The following guide describes how to run a network of Docker containers on a local machine, including one container for a PostgreSQL database and one container for PostGraphile. A the end of this guide, you will have a GraphQL API exposing data from a PostgreSQL database, both running locally on your machine in separate Docker containers.

![Architecture](https://github.com/alexisrolland/docker-postgresql-postgraphile/blob/master/doc/architecture.png)

You need this DevEnv Branch to Work with it
![DevEnv-GraphQl](https://github.com/ugr00p/UGroopDevEnv/tree/posgraphql)

# Requirements
Minimum Requirements: Postgres 11, as it needs custom plugins.
- Clean Database 

    - You can delete the data folder sits under your db project, it shall create all the database for you.
- If you want to keep the database, you need to dump your database, then restore it later by using the command below. 
    - psql -h 127.0.0.1 -U db_admin -d postgres -f your_dump.sql


## Hot to Run Graphql Service
If you use the PostGraphql DevEnv, you can just simply run `./service_start.sh`, especailly those who has slow computer, as it waits 1 mins for RabbitMQ and DB before it starts other services.

### Parameters description

<table>
    <tr>
        <th>Parameter</th><th>Description</th>
    </tr>
    <tr>
        <td><b>DB_SERVER</b></td>
        <td>Your DB server domain name</td>
    </tr>
    <tr>
         <td><b>DB_PORT</b></td>
         <td>Postgres Port, default: 5432 </td>
    </tr>
    <tr>
        <td><b>DATABASE_URL</b></td>
        <td>Postgraphile URL Format to connect the database<br/> postgres://db_admin:password@db:5432/yourDbName</td>
    </tr>
    <tr>
        <td><b>GRAPHQL_PORT</b></td>
        <td>In Development environment, you can use a Graphql Playground to test your graphql.<br/> So this is the port it will run that Graphql User Interface.</td>
    </tr>
</table>

## PostGraphile Dockerfile

For Development, it used node:12 as the base, and it will run the command below. <br/>
It shall give you enough to start your bare minimum feature of your Graphql. <br/>
More Information you can find ![here](https://www.graphile.org/postgraphile/usage-cli/)

```
START_CMD="postgraphile
  -n 0.0.0.0
  --watch
  --dynamic-json
  --no-setof-functions-contain-nulls
  --no-ignore-rbac
  --no-ignore-indexes
  --show-error-stack=json
  --extended-errors hint,detail,errcode
  --append-plugins @graphile-contrib/pg-simplify-inflector,postgraphile-plugin-connection-filter
  --export-schema-graphql ./schema/coordinate.schema.graphql
  --graphiql "/graphiql"
  --enhance-graphiql
  --allow-explain
  --enable-query-batching
  --legacy-relations omit
  --connection $DATABASE_URL
  --port $GRAPHQL_PORT
  --schema public
  "
```

For Production, some development features will be disabled, for instance, no export schema, no playground UI. 
```
CMD postgraphile \
      -n 0.0.0.0 \
      --retry-on-init-fail \
      --dynamic-json \
      --no-setof-functions-contain-nulls \
      --no-ignore-rbac \
      --no-ignore-indexes \
      --extended-errors errcode \
      --append-plugins @graphile-contrib/pg-simplify-inflector,postgraphile-plugin-connection-filter \
      --enable-query-batching \
      --disable-query-log  \
      --legacy-relations omit \
      --connection $DATABASE_URL \
      --port $GRAPHQL_PORT \
      --schema public
```
 
# Create PostGraphile Container

## Update Environment Variables

Update the file `.env` to add the `DATABASE_URL` which will be used by PostGraphile to connect to the PostgreSQL database. Note the `DATABASE_URL` follows the syntax `postgres://<user>:<password>@db:5432/<db_name>`.

```
[...]
# GRAPHQL
# Parameters used by graphql container
DATABASE_URL=postgres://postgres:change_me@db:5432/forum_example
```

## Create PostGraphile Dockerfile

Create a new folder `graphql` at the root of the repository. It will be used to store the files necessary to create the PostGraphile container. Create a new file `Dockerfile` in the `graphql` folder with the following content. You will notice we include the excellent plugin Connection Filter.

```dockerfile
FROM node:alpine
LABEL description="Instant high-performance GraphQL API for your PostgreSQL database https://github.com/graphile/postgraphile"

# Install PostGraphile and PostGraphile connection filter plugin
RUN npm install -g postgraphile
RUN npm install -g postgraphile-plugin-connection-filter

EXPOSE 5000
ENTRYPOINT ["postgraphile", "-n", "0.0.0.0"]
```

## Update Docker Compose File

Update the file `docker-compose.yml` under the `services` section to include the GraphQL service.

```yml
version: "3.3"
services:
    db: [...]

    graphql:
        container_name: forum-example-graphql
        restart: always
        image: forum-example-graphql
        build:
            context: ./graphql
        env_file:
            - ./.env
        depends_on:
            - db
        networks:
            - network
        ports:
            - 5433:5433
        command: ["--connection", "${DATABASE_URL}", "--port", "5433", "--schema", "public", "--append-plugins", "postgraphile-plugin-connection-filter"]
[...]
```

At this stage, the repository should look like this.

```
/
├─ EventGraphQl/
|  ├─ custom-plugin/
|  ├─ schema/
|  |  ├─ event.schema.graphql
|  └─ Dockerfile
|  └─ Dockerfile.prod
├─ .startup.sh // Development only, if you want to tweak your graphql feature, go there.
└─ .wait-for-it.sh
```

# Add Custom Plugin

## makeWrapResolversPlugin

This section is optional but describes how to wrap a resolver generated by PostGraphile in order to customize it. In the folder `graphql`, create a new subfolder named `custom-plugin`. In this folder create a new file `package.json` with the following content (you can update it to your convenience).

```json
{
    "name": "custom-plugin",
    "version": "0.0.1",
    "description": "Custom plugin example for PostGraphile.",
    "main": "index.js",
    "scripts": {
        "test": "echo \"Error: no test specified\" && exit 1"
    },
    "author": "Alexis ROLLAND",
    "license": "Apache-2.0",
    "dependencies": {
        "graphile-utils": "^4.5.6",
        "postgraphile": "^4.5.5"
    }
}
```

In the same folder `custom-plugin`, create a new file `index.js` with the following content.

```js
const { makeWrapResolversPlugin } = require("graphile-utils");

// Create custom wrapper for resolver createUser
const createUserResolverWrapper = () => {
    return async (resolve, source, args, context, resolveInfo) => {
        // You can do something before the resolver executes
        console.info("Hello world!");
        console.info(args);

        // Let resolver execute against database
        const result = await resolve();

        // You can do something after the resolver executes
        console.info("Hello again!");
        console.info(result);

        return result;
    };
};

// Register custom resolvers
module.exports = makeWrapResolversPlugin({
    Mutation: {
        createUser: createUserResolverWrapper()
    }
});
```

In each project folder, update the `Dockerfile.prod` so that it looks like the one below.

```dockerfile
FROM node:alpine
LABEL description="Instant high-performance GraphQL API for your PostgreSQL database https://github.com/graphile/postgraphile"
WORKDIR /home/coordinategraphql
# Install PostGraphile and PostGraphile connection filter plugin
RUN npm install -g postgraphile@4.9.0
RUN npm install -g @graphile-contrib/pg-simplify-inflector@6.0.0
RUN npm install -g postgraphile-plugin-connection-filter@2.0.0

# Install custom plugin
# COPY ./custom-plugin /tmp/custom-plugin
# RUN cd /tmp/custom-plugin && npm pack
# RUN npm install -g /tmp/custom-plugin/custom-plugin-0.0.1.tgz
# RUN rm -rf /tmp/custom-plugin
ADD ./wait-for-it.sh .
RUN ls
RUN chmod 755 wait-for-it.sh
EXPOSE 4040
CMD postgraphile \
      -n 0.0.0.0 \
      --retry-on-init-fail \
      --dynamic-json \
      --no-setof-functions-contain-nulls \
      --no-ignore-rbac \
      --no-ignore-indexes \
      --extended-errors errcode \
      --append-plugins @graphile-contrib/pg-simplify-inflector,postgraphile-plugin-connection-filter \
      --enable-query-batching \
      --disable-query-log  \
      --legacy-relations omit \
      --connection $DATABASE_URL \
      --port $GRAPHQL_PORT \
      --schema public

```

In the file `docker-compose.yml` from DevEnv,

```yml
version: "3.3"
services:
     db:
      build:
        context: ./projects/db // This will build postgres and install custom plugins.
      ports:
        - "5432:5432"
      environment:
        POSTGRES_USER: db_admin
        POSTGRES_PASSWORD: password
        PGDATA: /var/lib/postgresql/data/volume
      volumes:
        - ./projects/db/data:/var/lib/postgresql/data/volume
        - ./projects/db/initdb.d:/docker-entrypoint-initdb.d
        - ./projects/logs/db:/var/log/postgresql
        - ./projects/db/etc/postgresql.conf:/etc/postgresql.conf
        - ./projects/db/etc/pg_hba.conf:/etc/pg_hba.conf
     notifygraphql:
       build:
         context: ./projects/UGroopGraphql/NotificationGraphQl
       hostname: NotificationGraphQl
       environment:
         - DB_SERVER=db
         - DB_PORT=5432
         - DATABASE_URL=postgres://db_admin:password@db:5432/ugroop_notification_service
         - GRAPHQL_PORT=4005
       depends_on:
         - db
       ports:
         - 4005:4005
       volumes:
         - ./projects/UGroopGraphql/NotificationGraphQl/schema:/home/notifygraphql/schema
```

At this stage, the repository should look like this.

```
/
├─ db/
|  ├─ init/
|  |  ├─ 00-database.sql
|  |  └─ 01-data.sql
|  └─ Dockerfile
├─ graphql/
|  ├─ custom-plugin/
|  |  ├─ index.js
|  |  └─ package.json
|  └─ Dockerfile
├─ .env
└─ docker-compose.yml
```

# Queries Examples

## Queries

Example of query to get all posts and their author.

```
query {
  allPosts {
    nodes {
      id
      title
      body
      userByAuthorId {
        username
      }
    }
  }
}
```

![Query](https://github.com/alexisrolland/docker-postgresql-postgraphile/blob/master/doc/query.png)

## Mutations

Please do no use Mutation in this project, I have not disabled it.
