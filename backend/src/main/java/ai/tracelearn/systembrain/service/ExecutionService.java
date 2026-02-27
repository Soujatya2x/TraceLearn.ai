package ai.tracelearn.systembrain.service;

import ai.tracelearn.systembrain.domain.ExecutionAttempt;
import ai.tracelearn.systembrain.domain.ExecutionStatus;
import ai.tracelearn.systembrain.domain.Session;
import ai.tracelearn.systembrain.integration.dto.SandboxExecuteResponse;
import ai.tracelearn.systembrain.repository.ExecutionAttemptRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class ExecutionService {

    private final ExecutionAttemptRepository executionAttemptRepository;

    @Transactional
    public ExecutionAttempt createAttempt(Session session, int attemptNumber, String codeExecuted) {
        ExecutionAttempt attempt = ExecutionAttempt.builder()
                .session(session)
                .attemptNumber(attemptNumber)
                .status(ExecutionStatus.QUEUED)
                .codeExecuted(codeExecuted)
                .build();

        attempt = executionAttemptRepository.save(attempt);
        log.info("Execution attempt {} created for session {}", attemptNumber, session.getId());
        return attempt;
    }

    @Transactional
    public ExecutionAttempt recordResult(UUID attemptId, SandboxExecuteResponse response) {
        ExecutionAttempt attempt = executionAttemptRepository.findById(attemptId)
                .orElseThrow(() -> new RuntimeException("Execution attempt not found: " + attemptId));

        attempt.setStdout(response.getStdout());
        attempt.setStderr(response.getStderr());
        attempt.setExitCode(response.getExitCode());
        attempt.setExecutionTimeMs(response.getExecutionTime());

        if (response.getExitCode() == 0) {
            attempt.setStatus(ExecutionStatus.SUCCESS);
        } else if ("timeout".equalsIgnoreCase(response.getStatus())) {
            attempt.setStatus(ExecutionStatus.TIMEOUT);
        } else {
            attempt.setStatus(ExecutionStatus.FAILED);
        }

        attempt = executionAttemptRepository.save(attempt);
        log.info("Execution attempt {} recorded: status={}, exitCode={}",
                attemptId, attempt.getStatus(), attempt.getExitCode());
        return attempt;
    }

    @Transactional
    public void markAttemptRunning(UUID attemptId) {
        ExecutionAttempt attempt = executionAttemptRepository.findById(attemptId)
                .orElseThrow(() -> new RuntimeException("Execution attempt not found: " + attemptId));
        attempt.setStatus(ExecutionStatus.RUNNING);
        executionAttemptRepository.save(attempt);
    }

    @Transactional
    public void markAttemptError(UUID attemptId, String errorMessage) {
        ExecutionAttempt attempt = executionAttemptRepository.findById(attemptId)
                .orElseThrow(() -> new RuntimeException("Execution attempt not found: " + attemptId));
        attempt.setStatus(ExecutionStatus.ERROR);
        attempt.setStderr(errorMessage);
        executionAttemptRepository.save(attempt);
    }

    @Transactional(readOnly = true)
    public List<ExecutionAttempt> getAttemptsBySession(UUID sessionId) {
        return executionAttemptRepository.findBySessionIdOrderByAttemptNumberAsc(sessionId);
    }

    @Transactional(readOnly = true)
    public int getNextAttemptNumber(UUID sessionId) {
        return (int) executionAttemptRepository.countBySessionId(sessionId) + 1;
    }
}
