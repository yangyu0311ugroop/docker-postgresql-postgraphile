const { makeExtendSchemaPlugin, gql, embed } = require("graphile-utils");
// MySubscriptionPlugin.js
const currentPersonTopicFromContext = (_args, context, _resolveInfo) => {
    console.log('context', context);
    console.log('_args', _args);
        return `graphql:person:subscriptions`;
};

module.exports = makeExtendSchemaPlugin(({ pgSql: sql }) => ({
    typeDefs: gql`
        type PersonSubscriptionPayload {
            # This is populated by our resolver below
            person: Person

            # This is returned directly from the PostgreSQL subscription payload (JSON object)
            event: String
        }

        extend type Subscription {
            """
            Triggered when the current user's data changes:

            - direct modifications to the user
            - when their organization membership changes
            """
            personUpdated: PersonSubscriptionPayload @pgSubscription(topic: ${embed(
        currentPersonTopicFromContext
      )})
        }
    `,

    resolvers: {
        PersonSubscriptionPayload: {
            // This method finds the user from the database based on the event
            // published by PostgreSQL.
            //
            // In a future release, we hope to enable you to replace this entire
            // method with a small schema directive above, should you so desire. It's
            // mostly boilerplate.
            async person(
                event,
                _args,
                _context,
                { graphile: { selectGraphQLResultFromTable } }
            ) {
                console.log('event', event);
                const rows = await selectGraphQLResultFromTable(
                    sql.fragment`public.person`,
                    (tableAlias, sqlBuilder) => {
                        sqlBuilder.where(
                            sql.fragment`${tableAlias}.id = ${sql.value(event.subject)}`
                        );
                    }
                );
                return rows[0];
            },
        },
    },
}));
