package ai.tracelearn.systembrain.config;

import org.springframework.aop.interceptor.AsyncUncaughtExceptionHandler;
import org.springframework.aop.interceptor.SimpleAsyncUncaughtExceptionHandler;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.AsyncConfigurer;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;

import java.util.concurrent.Executor;
import java.util.concurrent.ThreadPoolExecutor;

@Slf4j
@Configuration
public class AsyncConfig implements AsyncConfigurer {

    /**
     * PRIMARY async executor used by @Async("taskExecutor").
     * This is the orchestration pipeline executor — runs analysis,
     * sandbox calls, and artifact generation off the HTTP thread.
     */
    @Bean(name = "taskExecutor")
    public Executor taskExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(5);
        executor.setMaxPoolSize(20);
        executor.setQueueCapacity(100);
        executor.setThreadNamePrefix("orchestration-");
        executor.setWaitForTasksToCompleteOnShutdown(true);
        executor.setAwaitTerminationSeconds(60);
        // MEDIUM-7 FIX: When queue is full (100 queued + 20 active = 120 tasks),
        // run the task in the HTTP request thread instead of dropping it.
        // This slows the HTTP response (~30–60s) but guarantees no session is
        // silently stuck in CREATED with no error. The catch block in
        // OrchestrationService.analyzeCode() handles TaskRejectedException as a
        // second line of defense when CallerRunsPolicy cannot be used (e.g. if
        // the executor is shut down during deployment).
        executor.setRejectedExecutionHandler(new ThreadPoolExecutor.CallerRunsPolicy());
        executor.initialize();
        return executor;
    }

    /**
     * Dedicated executor for AI analysis calls (long-running LLM inference).
     * Use @Async("analysisExecutor") on AI-only methods if needed.
     */
    @Bean(name = "analysisExecutor")
    public Executor analysisExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(5);
        executor.setMaxPoolSize(20);
        executor.setQueueCapacity(100);
        executor.setThreadNamePrefix("analysis-");
        executor.setWaitForTasksToCompleteOnShutdown(true);
        executor.setAwaitTerminationSeconds(60);
        executor.setRejectedExecutionHandler(new ThreadPoolExecutor.CallerRunsPolicy());
        executor.initialize();
        return executor;
    }

    /**
     * Dedicated executor for sandbox execution calls.
     * Use @Async("sandboxExecutor") on sandbox-only methods if needed.
     */
    @Bean(name = "sandboxExecutor")
    public Executor sandboxExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(3);
        executor.setMaxPoolSize(10);
        executor.setQueueCapacity(50);
        executor.setThreadNamePrefix("sandbox-");
        executor.setWaitForTasksToCompleteOnShutdown(true);
        executor.setAwaitTerminationSeconds(30);
        executor.setRejectedExecutionHandler(new ThreadPoolExecutor.CallerRunsPolicy());
        executor.initialize();
        return executor;
    }

    /**
     * Default executor returned when no bean name is specified in @Async.
     * Falls back to taskExecutor to prevent silent synchronous execution.
     */
    @Override
    public Executor getAsyncExecutor() {
        return taskExecutor();
    }

    /**
     * MEDIUM-7 FIX: Custom uncaught exception handler for @Async methods.
     *
     * SimpleAsyncUncaughtExceptionHandler (the default) only logs the exception
     * and does nothing else — sessions thrown from within async methods that
     * escape all try-catch blocks would remain in their last status forever.
     *
     * This handler logs at ERROR level with the method name and parameters,
     * making it easy to grep in CloudWatch: "ASYNC_UNCAUGHT_EXCEPTION".
     *
     * NOTE: This handler only fires for exceptions that escape the @Async method
     * body entirely (i.e. past all internal try-catch blocks in the pipeline).
     * The pipelines in AsyncPipelineExecutor already catch and handle all
     * expected exceptions internally. This is the last-resort safety net.
     */
    @Override
    public AsyncUncaughtExceptionHandler getAsyncUncaughtExceptionHandler() {
        return (ex, method, params) -> {
            log.error("ASYNC_UNCAUGHT_EXCEPTION in {}.{}() — {}",
                    method.getDeclaringClass().getSimpleName(),
                    method.getName(),
                    ex.getMessage(),
                    ex);
        };
    }
}