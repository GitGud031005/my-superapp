FROM eclipse-temurin:21.0.13_9-jdk-noble AS build
WORKDIR /workspace
COPY mvnw pom.xml ./
COPY .mvn .mvn
RUN ./mvnw -B dependency:go-offline
COPY src src
RUN ./mvnw -B package -DskipTests \
    && java -Djarmode=tools -jar target/superapp-backend-0.0.1-SNAPSHOT.jar extract --layers --launcher --destination /workspace/extracted

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
