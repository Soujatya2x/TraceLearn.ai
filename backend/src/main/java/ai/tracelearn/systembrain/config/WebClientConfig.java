package ai.tracelearn.systembrain.config;

import io.netty.channel.ChannelOption;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.reactive.ReactorClientHttpConnector;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.netty.http.client.HttpClient;

import java.time.Duration;

@Configuration
@RequiredArgsConstructor
public class WebClientConfig {

    private final AppProperties appProperties;

    @Bean(name = "sandboxWebClient")
    public WebClient sandboxWebClient() {
        HttpClient httpClient = HttpClient.create()
                .option(ChannelOption.CONNECT_TIMEOUT_MILLIS, appProperties.getSandbox().getConnectTimeoutMs())
                .responseTimeout(Duration.ofMillis(appProperties.getSandbox().getReadTimeoutMs()));

        return WebClient.builder()
                .baseUrl(appProperties.getSandbox().getBaseUrl())
                .clientConnector(new ReactorClientHttpConnector(httpClient))
                .build();
    }

    @Bean(name = "aiAgentWebClient")
    public WebClient aiAgentWebClient() {
        HttpClient httpClient = HttpClient.create()
                .option(ChannelOption.CONNECT_TIMEOUT_MILLIS, appProperties.getAiAgent().getConnectTimeoutMs())
                .responseTimeout(Duration.ofMillis(appProperties.getAiAgent().getReadTimeoutMs()));

        return WebClient.builder()
                .baseUrl(appProperties.getAiAgent().getBaseUrl())
                .clientConnector(new ReactorClientHttpConnector(httpClient))
                .build();
    }
}
