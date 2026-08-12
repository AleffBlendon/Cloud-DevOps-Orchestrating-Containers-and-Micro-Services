# Loja Veloz – Cloud DevOps E-commerce

Arquitetura de microsserviços para e-commerce, com Node.js, PostgreSQL, RabbitMQ, Docker, Kubernetes, Prometheus/Grafana, CI/CD e Terraform.

---

## Link do video: 
https://lnkd.in/p/ggb388et

## Serviços

| Serviço    | Porta | Descrição                          |
|------------|-------|------------------------------------|
| Gateway    | 3000  | API Gateway (proxy reverso)        |
| Orders     | 3001  | Serviço de Pedidos + PostgreSQL    |
| Payments   | 3002  | Serviço de Pagamentos (mock)       |
| Stock      | 3003  | Serviço de Estoque (in-memory)     |
| Prometheus | 9090  | Coleta de métricas                 |
| Grafana    | 3004  | Dashboard (`admin` / `admin`)      |
| RabbitMQ   | 15672 | Management UI (`guest` / `guest`)  |

---

## Subir o ambiente local

```bash
docker-compose up --build
```

Todos os serviços sobem automaticamente, incluindo PostgreSQL e RabbitMQ.

---

## Endpoints principais (via Gateway)

```bash
# Health checks
curl http://localhost:3000/health

# Criar pedido
curl -X POST http://localhost:3000/orders \
  -H "Content-Type: application/json" \
  -d '{"product": "camiseta-azul", "quantity": 2}'

# Listar pedidos
curl http://localhost:3000/orders

# Processar pagamento
curl -X POST http://localhost:3000/payments \
  -H "Content-Type: application/json" \
  -d '{"orderId": "<uuid>", "amount": 99.90}'

# Consultar estoque
curl http://localhost:3000/stock

# Reservar estoque
curl -X POST http://localhost:3000/stock/reserve \
  -H "Content-Type: application/json" \
  -d '{"productId": "camiseta-azul", "quantity": 1}'
```

---

## Kubernetes

### Pré-requisitos
- `kubectl` configurado
- `metrics-server` instalado (para o HPA)

### Aplicar todos os manifestos

```bash
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/configmap.yaml
kubectl apply -f k8s/secret.yaml
kubectl apply -f k8s/postgres.yaml
kubectl apply -f k8s/rabbitmq.yaml
kubectl apply -f k8s/orders.yaml
kubectl apply -f k8s/payments.yaml
kubectl apply -f k8s/stock.yaml
kubectl apply -f k8s/gateway.yaml
kubectl apply -f k8s/hpa-orders.yaml
kubectl apply -f k8s/prometheus.yaml
kubectl apply -f k8s/grafana.yaml
```

Acesse o Gateway via NodePort: `http://<node-ip>:30007`

### Substituir imagens
Antes de aplicar, substitua `YOUR_DOCKERHUB_USER` nos arquivos de k8s pelo seu usuário do Docker Hub.

---

## CI/CD (GitHub Actions)

Configure os seguintes **secrets** no repositório GitHub:

| Secret               | Descrição                                      |
|----------------------|------------------------------------------------|
| `DOCKERHUB_USERNAME` | Seu usuário do Docker Hub                      |
| `DOCKERHUB_TOKEN`    | Token de acesso do Docker Hub                  |
| `KUBE_CONFIG`        | Conteúdo do kubeconfig em base64 (`base64 -w0 ~/.kube/config`) |

O pipeline executa em push para `main`:
1. Build e lint de cada serviço
2. Build e push das imagens Docker (tagadas com SHA do commit)
3. Deploy no cluster Kubernetes com rolling update

---

## Terraform

```bash
cd terraform
cp terraform.tfvars.example terraform.tfvars
# edite terraform.tfvars com seus valores

terraform init
terraform plan
terraform apply
```

---

## Estrutura do projeto

```
.
├── services/
│   ├── gateway/        # API Gateway
│   ├── orders/         # Serviço de Pedidos
│   ├── payments/       # Serviço de Pagamentos (mock)
│   └── stock/          # Serviço de Estoque
├── k8s/                # Manifestos Kubernetes
├── terraform/          # Infraestrutura como código
├── observability/      # Prometheus + Grafana configs
├── .github/workflows/  # Pipeline CI/CD
└── docker-compose.yml
```

---

## Mensageria – RabbitMQ

O serviço de pedidos publica o evento `PedidoCriado` no exchange `loja_veloz` (tipo `topic`) sempre que um pedido é criado.  
Outros serviços podem se inscrever nessa fila para reagir ao evento.

Exchange: `loja_veloz`  
Routing key: `PedidoCriado`

---

## Observabilidade

- **Métricas**: cada serviço expõe `/metrics` no formato Prometheus
- **Prometheus**: coleta métricas de todos os serviços a cada 15s
- **Grafana**: dashboard pré-configurado em `http://localhost:3004` (admin/admin)
- **Logs**: todos os serviços usam `console.log` com prefixo do serviço
