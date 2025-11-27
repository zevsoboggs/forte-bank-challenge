import { createSwaggerSpec } from 'next-swagger-doc'

export const getApiDocs = async () => {
    const spec = createSwaggerSpec({
        apiFolder: 'src/app/api',
        definition: {
            openapi: '3.0.0',
            info: {
                title: 'Forte.AI API',
                version: '1.0.0',
                description: 'Integration API for Forte.AI Fraud Detection System',
                contact: {
                    name: 'GREKdev Support',
                    email: 'support@grekdev.com'
                }
            },
            components: {
                securitySchemes: {
                    ApiKeyAuth: {
                        type: 'apiKey',
                        in: 'header',
                        name: 'X-API-Key',
                    },
                },
            },
            security: [
                {
                    ApiKeyAuth: [],
                },
            ],
        },
    })
    return spec
}
