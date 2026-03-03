package ai.tracelearn.systembrain.service;

import ai.tracelearn.systembrain.domain.ExecutionMode;
import ai.tracelearn.systembrain.dto.DetectResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Detects the execution mode from CODE CONTENT ALONE.
 * Used by POST /api/v1/detect — called before the user uploads a log file.
 *
 * Detection layers (first match wins):
 *   1. Filename is a known build/config file               (confidence 0.95)
 *   2. Code contains framework-specific annotations/imports (confidence 0.9)
 *   3. No signals found → LIVE_EXECUTION                   (confidence 1.0)
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class CodeAnalysisDetector {

    // ─── Spring Boot / Spring Framework signatures ────────────────────────────
    // Covers: Spring Boot, Spring MVC, Spring Data, Spring Security,
    //         Spring Cloud, Spring Batch, Spring Integration, Spring WebFlux,
    //         Spring WebSocket, Spring Kafka, Spring AMQP, Hibernate/JPA

    private static final Map<String, String> SPRINGBOOT_CODE_SIGNATURES = new LinkedHashMap<>() {{

        // ── Core Spring Boot annotations ──────────────────────────────────────
        put("@SpringBootApplication",          "Found @SpringBootApplication");
        put("@EnableAutoConfiguration",        "Found @EnableAutoConfiguration");
        put("@SpringBootTest",                 "Found @SpringBootTest");
        put("@EnableSpringDataWebSupport",     "Found @EnableSpringDataWebSupport");
        put("@EnableScheduling",               "Found @EnableScheduling");
        put("@EnableAsync",                    "Found @EnableAsync");
        put("@EnableCaching",                  "Found @EnableCaching");
        put("@EnableTransactionManagement",    "Found @EnableTransactionManagement");
        put("@EnableWebSecurity",              "Found @EnableWebSecurity");
        put("@EnableMethodSecurity",           "Found @EnableMethodSecurity");
        put("@EnableGlobalMethodSecurity",     "Found @EnableGlobalMethodSecurity");
        put("@EnableWebMvc",                   "Found @EnableWebMvc");
        put("@EnableWebFlux",                  "Found @EnableWebFlux");
        put("@EnableJpaRepositories",          "Found @EnableJpaRepositories");
        put("@EnableMongoRepositories",        "Found @EnableMongoRepositories");
        put("@EnableRedisRepositories",        "Found @EnableRedisRepositories");
        put("@EnableKafka",                    "Found @EnableKafka");
        put("@EnableRabbit",                   "Found @EnableRabbit");
        put("@EnableBatchProcessing",          "Found @EnableBatchProcessing");
        put("@EnableDiscoveryClient",          "Found @EnableDiscoveryClient (Spring Cloud)");
        put("@EnableFeignClients",             "Found @EnableFeignClients (Spring Cloud)");
        put("@EnableCircuitBreaker",           "Found @EnableCircuitBreaker (Spring Cloud)");
        put("@EnableEurekaClient",             "Found @EnableEurekaClient");
        put("@EnableEurekaServer",             "Found @EnableEurekaServer");
        put("@EnableConfigServer",             "Found @EnableConfigServer");
        put("@EnableZuulProxy",                "Found @EnableZuulProxy");
        put("SpringApplication.run",           "Found SpringApplication.run");

        // ── Stereotype annotations ────────────────────────────────────────────
        put("@RestController",                 "Found @RestController");
        put("@Controller",                     "Found @Controller");
        put("@Service",                        "Found @Service annotation");
        put("@Repository",                     "Found @Repository");
        put("@Component",                      "Found @Component");
        put("@Configuration",                  "Found @Configuration");
        put("@ControllerAdvice",               "Found @ControllerAdvice");
        put("@RestControllerAdvice",           "Found @RestControllerAdvice");

        // ── Dependency injection ──────────────────────────────────────────────
        put("@Autowired",                      "Found @Autowired");
        put("@Qualifier",                      "Found @Qualifier");
        put("@Value(",                         "Found @Value injection");
        put("@Bean",                           "Found @Bean");
        put("@Primary",                        "Found @Primary");
        put("@Lazy",                           "Found @Lazy");
        put("@Scope(",                         "Found @Scope");
        put("@ConditionalOnProperty",          "Found @ConditionalOnProperty");
        put("@ConditionalOnMissingBean",       "Found @ConditionalOnMissingBean");
        put("@ConditionalOnBean",              "Found @ConditionalOnBean");
        put("@ConditionalOnClass",             "Found @ConditionalOnClass");
        put("@ConditionalOnExpression",        "Found @ConditionalOnExpression");

        // ── Web / MVC mappings ────────────────────────────────────────────────
        put("@RequestMapping",                 "Found @RequestMapping");
        put("@GetMapping",                     "Found @GetMapping");
        put("@PostMapping",                    "Found @PostMapping");
        put("@PutMapping",                     "Found @PutMapping");
        put("@DeleteMapping",                  "Found @DeleteMapping");
        put("@PatchMapping",                   "Found @PatchMapping");
        put("@RequestBody",                    "Found @RequestBody");
        put("@RequestParam",                   "Found @RequestParam");
        put("@RequestPart",                    "Found @RequestPart");
        put("@PathVariable",                   "Found @PathVariable");
        put("@RequestHeader",                  "Found @RequestHeader");
        put("@ResponseBody",                   "Found @ResponseBody");
        put("@ResponseStatus",                 "Found @ResponseStatus");
        put("@CrossOrigin",                    "Found @CrossOrigin");
        put("@MatrixVariable",                 "Found @MatrixVariable");
        put("@ModelAttribute",                 "Found @ModelAttribute");
        put("@SessionAttribute",               "Found @SessionAttribute");
        put("@CookieValue",                    "Found @CookieValue");
        put("ResponseEntity<",                 "Found ResponseEntity usage");
        put("HttpStatus.",                     "Found HttpStatus usage");
        put("MultipartFile",                   "Found MultipartFile (Spring MVC)");

        // ── WebFlux / Reactive ────────────────────────────────────────────────
        put("@RestController\nimport reactor", "Found WebFlux RestController");
        put("Mono<",                           "Found Reactor Mono (WebFlux)");
        put("Flux<",                           "Found Reactor Flux (WebFlux)");
        put("RouterFunction",                  "Found RouterFunction (WebFlux)");
        put("ServerRequest",                   "Found ServerRequest (WebFlux)");
        put("ServerResponse",                  "Found ServerResponse (WebFlux)");
        put("WebClient",                       "Found WebClient (WebFlux)");

        // ── Data / JPA / Hibernate ────────────────────────────────────────────
        put("@Entity",                         "Found @Entity (JPA)");
        put("@Table(",                         "Found @Table (JPA)");
        put("@Column(",                        "Found @Column (JPA)");
        put("@Id",                             "Found @Id (JPA)");
        put("@GeneratedValue",                 "Found @GeneratedValue (JPA)");
        put("@ManyToOne",                      "Found @ManyToOne (JPA)");
        put("@OneToMany",                      "Found @OneToMany (JPA)");
        put("@OneToOne",                       "Found @OneToOne (JPA)");
        put("@ManyToMany",                     "Found @ManyToMany (JPA)");
        put("@JoinColumn",                     "Found @JoinColumn (JPA)");
        put("@JoinTable",                      "Found @JoinTable (JPA)");
        put("@Transient",                      "Found @Transient (JPA)");
        put("@Enumerated",                     "Found @Enumerated (JPA)");
        put("@Embeddable",                     "Found @Embeddable (JPA)");
        put("@Embedded",                       "Found @Embedded (JPA)");
        put("@MappedSuperclass",               "Found @MappedSuperclass (JPA)");
        put("@Inheritance",                    "Found @Inheritance (JPA)");
        put("@NamedQuery",                     "Found @NamedQuery (JPA)");
        put("@Query(",                         "Found @Query (Spring Data)");
        put("@Modifying",                      "Found @Modifying (Spring Data)");
        put("@Transactional",                  "Found @Transactional");
        put("extends JpaRepository",           "Found JpaRepository");
        put("extends CrudRepository",          "Found CrudRepository");
        put("extends PagingAndSortingRepository", "Found PagingAndSortingRepository");
        put("extends MongoRepository",         "Found MongoRepository");
        put("extends ReactiveMongoRepository", "Found ReactiveMongoRepository");
        put("extends R2dbcRepository",         "Found R2dbcRepository");
        put("extends ElasticsearchRepository", "Found ElasticsearchRepository");
        put("JdbcTemplate",                    "Found JdbcTemplate");
        put("NamedParameterJdbcTemplate",      "Found NamedParameterJdbcTemplate");
        put("EntityManager",                   "Found EntityManager (JPA)");
        put("@PersistenceContext",             "Found @PersistenceContext");

        // ── Security ──────────────────────────────────────────────────────────
        put("@PreAuthorize",                   "Found @PreAuthorize (Spring Security)");
        put("@PostAuthorize",                  "Found @PostAuthorize (Spring Security)");
        put("@Secured(",                       "Found @Secured (Spring Security)");
        put("@RolesAllowed",                   "Found @RolesAllowed");
        put("SecurityFilterChain",             "Found SecurityFilterChain");
        put("HttpSecurity",                    "Found HttpSecurity (Spring Security)");
        put("UserDetails",                     "Found UserDetails (Spring Security)");
        put("UserDetailsService",              "Found UserDetailsService");
        put("AuthenticationPrincipal",         "Found @AuthenticationPrincipal");
        put("AuthenticationManager",           "Found AuthenticationManager");
        put("PasswordEncoder",                 "Found PasswordEncoder");
        put("BCryptPasswordEncoder",           "Found BCryptPasswordEncoder");
        put("UsernamePasswordAuthenticationToken", "Found UsernamePasswordAuthenticationToken");
        put("SecurityContextHolder",           "Found SecurityContextHolder");
        put("OncePerRequestFilter",            "Found OncePerRequestFilter (JWT filter)");

        // ── Validation ────────────────────────────────────────────────────────
        put("@Valid",                          "Found @Valid");
        put("@Validated",                      "Found @Validated");
        put("@NotNull",                        "Found @NotNull (Bean Validation)");
        put("@NotBlank",                       "Found @NotBlank (Bean Validation)");
        put("@NotEmpty",                       "Found @NotEmpty (Bean Validation)");
        put("@Size(",                          "Found @Size (Bean Validation)");
        put("@Min(",                           "Found @Min (Bean Validation)");
        put("@Max(",                           "Found @Max (Bean Validation)");
        put("@Pattern(",                       "Found @Pattern (Bean Validation)");
        put("@Email",                          "Found @Email (Bean Validation)");
        put("BindingResult",                   "Found BindingResult (validation)");

        // ── Exception handling ────────────────────────────────────────────────
        put("@ExceptionHandler",               "Found @ExceptionHandler");
        put("ResponseEntityExceptionHandler",  "Found ResponseEntityExceptionHandler");
        put("ProblemDetail",                   "Found ProblemDetail (RFC 7807)");

        // ── Actuator / Observability ──────────────────────────────────────────
        put("@Endpoint(",                      "Found @Endpoint (Actuator)");
        put("@ReadOperation",                  "Found @ReadOperation (Actuator)");
        put("MeterRegistry",                   "Found MeterRegistry (Micrometer)");
        put("@Timed",                          "Found @Timed (Micrometer)");
        put("@Counted",                        "Found @Counted (Micrometer)");

        // ── Scheduling / Async ────────────────────────────────────────────────
        put("@Scheduled(",                     "Found @Scheduled");
        put("@Async",                          "Found @Async");

        // ── Caching ───────────────────────────────────────────────────────────
        put("@Cacheable(",                     "Found @Cacheable");
        put("@CacheEvict(",                    "Found @CacheEvict");
        put("@CachePut(",                      "Found @CachePut");

        // ── Messaging / Kafka / RabbitMQ ──────────────────────────────────────
        put("@KafkaListener",                  "Found @KafkaListener (Spring Kafka)");
        put("@RabbitListener",                 "Found @RabbitListener (Spring AMQP)");
        put("@JmsListener",                    "Found @JmsListener (Spring JMS)");
        put("KafkaTemplate",                   "Found KafkaTemplate");
        put("RabbitTemplate",                  "Found RabbitTemplate");
        put("JmsTemplate",                     "Found JmsTemplate");

        // ── WebSocket ─────────────────────────────────────────────────────────
        put("@EnableWebSocketMessageBroker",   "Found @EnableWebSocketMessageBroker");
        put("@MessageMapping",                 "Found @MessageMapping (WebSocket)");
        put("@SendTo",                         "Found @SendTo (WebSocket)");
        put("SimpMessagingTemplate",           "Found SimpMessagingTemplate (WebSocket)");

        // ── Batch ─────────────────────────────────────────────────────────────
        put("@StepScope",                      "Found @StepScope (Spring Batch)");
        put("@JobScope",                       "Found @JobScope (Spring Batch)");
        put("ItemProcessor<",                  "Found ItemProcessor (Spring Batch)");
        put("ItemReader<",                     "Found ItemReader (Spring Batch)");
        put("ItemWriter<",                     "Found ItemWriter (Spring Batch)");

        // ── Spring imports (catch-all) ────────────────────────────────────────
        put("import org.springframework",      "Found org.springframework import");
        put("import reactor.core",             "Found reactor.core import (WebFlux)");
        put("import jakarta.persistence",      "Found jakarta.persistence import");
        put("import javax.persistence",        "Found javax.persistence import");
        put("import jakarta.validation",       "Found jakarta.validation import");
        put("import javax.validation",         "Found javax.validation import");

        // ── Lombok (almost always used with Spring Boot) ───────────────────────
        put("import lombok",                   "Found Lombok import (Spring Boot project)");
    }};

    // ─── FastAPI / Python async web framework signatures ──────────────────────
    // Covers: FastAPI, Pydantic v1/v2, SQLAlchemy, Alembic, Celery,
    //         aiohttp, httpx, pytest-asyncio, Starlette

    private static final Map<String, String> FASTAPI_CODE_SIGNATURES = new LinkedHashMap<>() {{

        // ── Core FastAPI ──────────────────────────────────────────────────────
        put("from fastapi import",             "Found FastAPI import");
        put("import fastapi",                  "Found FastAPI import");
        put("FastAPI()",                       "Found FastAPI() instantiation");
        put("FastAPI(title=",                  "Found FastAPI(title=...) instantiation");
        put("FastAPI(debug=",                  "Found FastAPI(debug=...) instantiation");
        put("app = FastAPI",                   "Found app = FastAPI(...)");
        put("APIRouter()",                     "Found APIRouter()");
        put("APIRouter(prefix=",              "Found APIRouter(prefix=...)");
        put("include_router(",                 "Found include_router (FastAPI routing)");

        // ── Route decorators ──────────────────────────────────────────────────
        put("@app.get(",                       "Found @app.get route");
        put("@app.post(",                      "Found @app.post route");
        put("@app.put(",                       "Found @app.put route");
        put("@app.delete(",                    "Found @app.delete route");
        put("@app.patch(",                     "Found @app.patch route");
        put("@app.options(",                   "Found @app.options route");
        put("@app.head(",                      "Found @app.head route");
        put("@app.websocket(",                 "Found @app.websocket route");
        put("@router.get(",                    "Found @router.get route");
        put("@router.post(",                   "Found @router.post route");
        put("@router.put(",                    "Found @router.put route");
        put("@router.delete(",                 "Found @router.delete route");
        put("@router.patch(",                  "Found @router.patch route");
        put("@router.websocket(",              "Found @router.websocket route");

        // ── Dependency injection ──────────────────────────────────────────────
        put("Depends(",                        "Found Depends() (FastAPI DI)");
        put("Security(",                       "Found Security() (FastAPI)");
        put("BackgroundTasks",                 "Found BackgroundTasks (FastAPI)");
        put("Request",                         "Found Request (Starlette/FastAPI)");
        put("Response",                        "Found Response (Starlette/FastAPI)");
        put("JSONResponse",                    "Found JSONResponse");
        put("HTMLResponse",                    "Found HTMLResponse");
        put("StreamingResponse",               "Found StreamingResponse");
        put("FileResponse",                    "Found FileResponse");
        put("RedirectResponse",                "Found RedirectResponse");

        // ── Pydantic v1 and v2 ────────────────────────────────────────────────
        put("from pydantic import",            "Found Pydantic import");
        put("import pydantic",                 "Found Pydantic import");
        put("BaseModel",                       "Found Pydantic BaseModel");
        put("BaseSettings",                    "Found Pydantic BaseSettings");
        put("Field(",                          "Found Pydantic Field()");
        put("validator(",                      "Found Pydantic validator");
        put("field_validator(",                "Found Pydantic v2 field_validator");
        put("model_validator(",                "Found Pydantic v2 model_validator");
        put("@model_validator",                "Found @model_validator (Pydantic v2)");
        put("model_config",                    "Found model_config (Pydantic v2)");
        put("ConfigDict(",                     "Found ConfigDict (Pydantic v2)");
        put("RootModel",                       "Found RootModel (Pydantic v2)");
        put("from pydantic_settings",          "Found pydantic-settings import");

        // ── Exception handling ────────────────────────────────────────────────
        put("HTTPException",                   "Found HTTPException (FastAPI)");
        put("RequestValidationError",          "Found RequestValidationError");
        put("ValidationError",                 "Found ValidationError (Pydantic)");
        put("@app.exception_handler",          "Found exception_handler decorator");

        // ── Middleware ────────────────────────────────────────────────────────
        put("app.add_middleware(",             "Found add_middleware (FastAPI)");
        put("CORSMiddleware",                  "Found CORSMiddleware");
        put("GZipMiddleware",                  "Found GZipMiddleware");
        put("HTTPSRedirectMiddleware",         "Found HTTPSRedirectMiddleware");
        put("TrustedHostMiddleware",           "Found TrustedHostMiddleware");
        put("BaseHTTPMiddleware",              "Found BaseHTTPMiddleware (Starlette)");

        // ── Startup / shutdown events ─────────────────────────────────────────
        put("@app.on_event(",                  "Found @app.on_event (FastAPI lifecycle)");
        put("@app.lifespan",                   "Found @app.lifespan (FastAPI v0.93+)");
        put("@asynccontextmanager",            "Found @asynccontextmanager (lifespan)");

        // ── SQLAlchemy / databases ────────────────────────────────────────────
        put("from sqlalchemy",                 "Found SQLAlchemy import");
        put("import sqlalchemy",               "Found SQLAlchemy import");
        put("declarative_base()",              "Found declarative_base() (SQLAlchemy)");
        put("DeclarativeBase",                 "Found DeclarativeBase (SQLAlchemy 2.0)");
        put("AsyncSession",                    "Found AsyncSession (SQLAlchemy async)");
        put("create_engine(",                  "Found create_engine (SQLAlchemy)");
        put("create_async_engine(",            "Found create_async_engine");
        put("sessionmaker(",                   "Found sessionmaker (SQLAlchemy)");
        put("async_sessionmaker(",             "Found async_sessionmaker");
        put("Column(",                         "Found Column (SQLAlchemy)");
        put("relationship(",                   "Found relationship (SQLAlchemy)");
        put("ForeignKey(",                     "Found ForeignKey (SQLAlchemy)");
        put("from databases import",           "Found databases import (async DB)");
        put("from tortoise",                   "Found Tortoise ORM import");

        // ── Alembic (database migrations) ────────────────────────────────────
        put("from alembic",                    "Found Alembic import (FastAPI migrations)");
        put("import alembic",                  "Found Alembic import");

        // ── Authentication / JWT ──────────────────────────────────────────────
        put("from jose import",                "Found python-jose (JWT for FastAPI)");
        put("from passlib",                    "Found passlib (password hashing)");
        put("OAuth2PasswordBearer",            "Found OAuth2PasswordBearer");
        put("OAuth2PasswordRequestForm",       "Found OAuth2PasswordRequestForm");
        put("HTTPBearer",                      "Found HTTPBearer");
        put("HTTPBasic",                       "Found HTTPBasic");
        put("APIKeyHeader",                    "Found APIKeyHeader");
        put("APIKeyQuery",                     "Found APIKeyQuery");

        // ── Async / ASGI ──────────────────────────────────────────────────────
        put("uvicorn.run(",                    "Found uvicorn.run");
        put("import uvicorn",                  "Found uvicorn import");
        put("from starlette",                  "Found Starlette import");
        put("import starlette",                "Found Starlette import");
        put("async def ",                      "Found async def (async FastAPI handler)");
        put("await ",                          "Found await (async FastAPI)");

        // ── Testing ───────────────────────────────────────────────────────────
        put("TestClient(",                     "Found TestClient (FastAPI testing)");
        put("AsyncClient(",                    "Found AsyncClient (httpx FastAPI test)");
        put("from httpx import",               "Found httpx import (FastAPI testing)");
        put("pytest.mark.asyncio",             "Found pytest-asyncio mark");

        // ── Celery / background tasks ─────────────────────────────────────────
        put("from celery import",              "Found Celery import");
        put("@celery.task",                    "Found @celery.task");
        put("@app.task",                       "Found @app.task (Celery)");

        // ── Commonly co-located utilities ─────────────────────────────────────
        put("from typing import",              "Found typing import (FastAPI type hints)");
        put("Annotated[",                      "Found Annotated (FastAPI/Pydantic v2)");
        put("Optional[",                       "Found Optional type hint");
        put("Union[",                          "Found Union type hint");
    }};

    // ─── Build/config filenames ───────────────────────────────────────────────

    private static final Map<String, String> BUILD_FILENAMES = new LinkedHashMap<>() {{
        // Spring Boot
        put("pom.xml",                  "springboot");
        put("build.gradle",             "springboot");
        put("build.gradle.kts",         "springboot");
        put("settings.gradle",          "springboot");
        put("settings.gradle.kts",      "springboot");
        put("application.yml",          "springboot");
        put("application.yaml",         "springboot");
        put("application.properties",   "springboot");
        put("bootstrap.yml",            "springboot");
        put("bootstrap.yaml",           "springboot");
        put("bootstrap.properties",     "springboot");
        put("logback-spring.xml",       "springboot");
        put("logback.xml",              "springboot");
        put("log4j2-spring.xml",        "springboot");
        put("log4j2.xml",               "springboot");
        put("banner.txt",               "springboot");

        // FastAPI / Python
        put("requirements.txt",         "fastapi");
        put("pyproject.toml",           "fastapi");
        put("setup.py",                 "fastapi");
        put("setup.cfg",                "fastapi");
        put("pipfile",                  "fastapi");
        put("pipfile.lock",             "fastapi");
        put("alembic.ini",              "fastapi");
        put("celeryconfig.py",          "fastapi");
        put(".env",                     "fastapi");
    }};

    // ─── Public API ──────────────────────────────────────────────────────────

    public DetectResponse detect(String codeContent, String filename) {

        // ── Layer 1: Build/config filename (highest confidence) ───────────────
        if (filename != null && !filename.isBlank()) {
            String lower = filename.toLowerCase().trim();
            for (Map.Entry<String, String> entry : BUILD_FILENAMES.entrySet()) {
                if (lower.endsWith(entry.getKey())) {
                    String framework = entry.getValue();
                    String reason = "Filename '" + filename + "' is a " + framework + " config/build file";
                    log.debug("CodeAnalysisDetector: build file match — {}", reason);
                    return DetectResponse.builder()
                            .mode(ExecutionMode.LOG_ANALYSIS.name())
                            .detectedFramework(framework)
                            .confidence(0.95)
                            .reason(reason)
                            .build();
                }
            }
        }

        // ── Layer 2: Scan code content ────────────────────────────────────────
        if (codeContent != null && !codeContent.isBlank()) {

            // Spring Boot scan
            for (Map.Entry<String, String> entry : SPRINGBOOT_CODE_SIGNATURES.entrySet()) {
                if (codeContent.contains(entry.getKey())) {
                    log.debug("CodeAnalysisDetector: Spring Boot signature '{}' matched", entry.getKey());
                    return DetectResponse.builder()
                            .mode(ExecutionMode.LOG_ANALYSIS.name())
                            .detectedFramework("springboot")
                            .confidence(0.9)
                            .reason(entry.getValue())
                            .build();
                }
            }

            // FastAPI scan
            for (Map.Entry<String, String> entry : FASTAPI_CODE_SIGNATURES.entrySet()) {
                if (codeContent.contains(entry.getKey())) {
                    log.debug("CodeAnalysisDetector: FastAPI signature '{}' matched", entry.getKey());
                    return DetectResponse.builder()
                            .mode(ExecutionMode.LOG_ANALYSIS.name())
                            .detectedFramework("fastapi")
                            .confidence(0.9)
                            .reason(entry.getValue())
                            .build();
                }
            }
        }

        // ── Default: LIVE_EXECUTION ───────────────────────────────────────────
        log.debug("CodeAnalysisDetector: no signals found → LIVE_EXECUTION");
        return DetectResponse.builder()
                .mode(ExecutionMode.LIVE_EXECUTION.name())
                .detectedFramework(null)
                .confidence(1.0)
                .reason("No framework signatures found — standard standalone code")
                .build();
    }
}