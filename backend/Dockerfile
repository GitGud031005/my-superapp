FROM eclipse-temurin:21.0.13_9-jdk-noble AS build
WORKDIR /workspace
COPY mvnw pom.xml ./
COPY .mvn .mvn
RUN ./mvnw -B dependency:go-offline
COPY src src
RUN ./mvnw -B package -DskipTests \
    && cp target/*.jar app.jar \
    && java -Djarmode=tools -jar app.jar extract --layers --launcher --destination /workspace/extracted

FROM eclipse-temurin:21.0.13_9-jre-noble
RUN useradd --system --uid 10001 --no-create-home --shell /usr/sbin/nologin app
WORKDIR /app
COPY --from=build /workspace/extracted/dependencies/ ./
COPY --from=build /workspace/extracted/spring-boot-loader/ ./
COPY --from=build /workspace/extracted/snapshot-dependencies/ ./
COPY --from=build /workspace/extracted/application/ ./
USER 10001
EXPOSE 8080
ENTRYPOINT ["java", "-XX:MaxRAMPercentage=75", "-Duser.timezone=UTC", "org.springframework.boot.loader.launch.JarLauncher"]
