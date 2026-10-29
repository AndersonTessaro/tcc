param location string = resourceGroup().location
param acrName string
param apiImage string
param webImage string
param pgHost string
param pgUser string
@secure()
param pgPassword string
param driveFolderId string
param driveClientId string
@secure()
param driveClientSecret string
@secure()
param driveRefreshToken string

resource acr 'Microsoft.ContainerRegistry/registries@2023-07-01' existing = {
  name: acrName
}

resource env 'Microsoft.App/managedEnvironments@2024-03-01' = {
  name: 'harmonia-env'
  location: location
  properties: {}
}

var registries = [
  {
    server: acr.properties.loginServer
    username: acr.listCredentials().username
    passwordSecretRef: 'acr-password'
  }
]

// ponytail: minReplicas 0 keeps it inside the free grant; first request after idle waits for JVM + Flyway, and the daily notification cron only fires while a replica is up.
resource api 'Microsoft.App/containerApps@2024-03-01' = {
  name: 'harmonia-api'
  location: location
  properties: {
    managedEnvironmentId: env.id
    configuration: {
      ingress: {
        external: true
        targetPort: 8080
      }
      registries: registries
      secrets: [
        { name: 'acr-password', value: acr.listCredentials().passwords[0].value }
        { name: 'pg-password', value: pgPassword }
        { name: 'drive-client-secret', value: driveClientSecret }
        { name: 'drive-refresh-token', value: driveRefreshToken }
      ]
    }
    template: {
      containers: [
        {
          name: 'api'
          image: apiImage
          resources: { cpu: json('1.0'), memory: '2Gi' }
          env: [
            { name: 'SPRING_DATASOURCE_URL', value: 'jdbc:postgresql://${pgHost}:5432/harmonia?sslmode=require' }
            { name: 'SPRING_DATASOURCE_USERNAME', value: pgUser }
            { name: 'SPRING_DATASOURCE_PASSWORD', secretRef: 'pg-password' }
            { name: 'SPRING_DOCKER_COMPOSE_ENABLED', value: 'false' }
            { name: 'APP_COOKIE_SECURE', value: 'true' }
            { name: 'APP_STORAGE_PROVIDER', value: 'google-drive' }
            { name: 'APP_STORAGE_GOOGLE_DRIVE_FOLDER_ID', value: driveFolderId }
            { name: 'APP_STORAGE_GOOGLE_DRIVE_CLIENT_ID', value: driveClientId }
            { name: 'APP_STORAGE_GOOGLE_DRIVE_CLIENT_SECRET', secretRef: 'drive-client-secret' }
            { name: 'APP_STORAGE_GOOGLE_DRIVE_REFRESH_TOKEN', secretRef: 'drive-refresh-token' }
            { name: 'JAVA_TOOL_OPTIONS', value: '-XX:MaxRAMPercentage=75' }
          ]
        }
      ]
      scale: { minReplicas: 0, maxReplicas: 1 }
    }
  }
}

resource web 'Microsoft.App/containerApps@2024-03-01' = {
  name: 'harmonia-web'
  location: location
  properties: {
    managedEnvironmentId: env.id
    configuration: {
      ingress: {
        external: true
        targetPort: 80
      }
      registries: registries
      secrets: [
        { name: 'acr-password', value: acr.listCredentials().passwords[0].value }
      ]
    }
    template: {
      containers: [
        {
          name: 'web'
          image: webImage
          resources: { cpu: json('0.25'), memory: '0.5Gi' }
          env: [
            { name: 'API_URL', value: 'https://${api.properties.configuration.ingress.fqdn}' }
            { name: 'API_HOST', value: api.properties.configuration.ingress.fqdn }
          ]
        }
      ]
      scale: { minReplicas: 0, maxReplicas: 1 }
    }
  }
}

output apiUrl string = 'https://${api.properties.configuration.ingress.fqdn}'
output webUrl string = 'https://${web.properties.configuration.ingress.fqdn}'
