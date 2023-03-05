import { CfnOutput, Duration, RemovalPolicy, Stack, StackProps } from "aws-cdk-lib";
import { AmazonLinuxGeneration, InstanceType, SecurityGroup, SubnetType, Vpc } from "aws-cdk-lib/aws-ec2";
import { Role, ServicePrincipal } from "aws-cdk-lib/aws-iam";
import { AmazonLinuxImage, Instance, InstanceClass, InstanceSize, Peer, Port } from "aws-cdk-lib/aws-ec2";
import * as fs from "fs";
import * as path from "path";
import { Construct } from "constructs";
import { Credentials, DatabaseInstance, DatabaseInstanceEngine, DatabaseSecret, MysqlEngineVersion } from "aws-cdk-lib/aws-rds";
import { Secret } from "aws-cdk-lib/aws-secretsmanager";

export class WanderersLegacyStack extends Stack {
  url: string

  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id);

    // Create a new VPC for hosting the site and db
    const wanderersLegacyVPC = new Vpc(this, "WanderersLegacyVPC", {
      cidr: "10.0.0.0/16",
      maxAzs: 2,
      subnetConfiguration: [
        {
          cidrMask: 24,
          name: "public",
          subnetType: SubnetType.PUBLIC,          
        },
        {
          cidrMask: 24,
          name: "private",
          subnetType: SubnetType.PRIVATE_ISOLATED,
        },
      ],
    });


    // Create a new security group for the site
    const wgSecurityGroup = new SecurityGroup(this, "WanderersLegacySiteSecurityGroup", {
      vpc: wanderersLegacyVPC,
    });

    // Allow console access, as well as traffic 
    wgSecurityGroup.addIngressRule(Peer.anyIpv4(), Port.tcp(22));
    wgSecurityGroup.addIngressRule(Peer.anyIpv4(), Port.tcp(80));
    wgSecurityGroup.addIngressRule(Peer.anyIpv4(), Port.tcp(443));
    wgSecurityGroup.addIngressRule(Peer.anyIpv4(), Port.tcp(3030));

    // Create a new IAM role for the EC2 instance
    const role = new Role(this, "WanderersLegacySiteEC2InstanceRole", {
      assumedBy: new ServicePrincipal("ec2.amazonaws.com"),
    });

    const instanceIdentifier = 'wanderers-legacy'
    const credsSecretName = `/${id}/rds/creds/${instanceIdentifier}`.toLowerCase()
    const creds = new DatabaseSecret(this, 'WanderersLegacyRdsCredentials', {
      secretName: credsSecretName,
      username: 'admin'
    })
    
    // Create a security group for the RDS instance
    const rdsSecurityGroup = new SecurityGroup(this, 'WanderersLegacyRDSSecurityGroup', {
      vpc: wanderersLegacyVPC,
    });

    // Add internal access to the mysql instance
    rdsSecurityGroup.addIngressRule(Peer.ipv4(wanderersLegacyVPC.vpcCidrBlock), Port.tcp(3306), 'Allow connections from within VPC');

    // Create an RDS instance with MySQL 8.0
    const wanderersLegacyRDS = new DatabaseInstance(this, 'WanderersLegacyRDS', {
      engine: DatabaseInstanceEngine.mysql({
        version: MysqlEngineVersion.VER_8_0_23,
      }),
      instanceType: InstanceType.of(InstanceClass.T2, InstanceSize.MICRO),
      vpc: wanderersLegacyVPC,
      vpcSubnets: {
        subnetType: SubnetType.PUBLIC,
      },
      instanceIdentifier,
      credentials: Credentials.fromSecret(creds),
      securityGroups: [rdsSecurityGroup],
      deletionProtection: false, // set to true to enable deletion protection
      autoMinorVersionUpgrade: true,
      backupRetention: Duration.days(7),
      preferredBackupWindow: '07:00-09:00',
      removalPolicy: RemovalPolicy.DESTROY
    });

    // Create a new EC2 instance
    const wanderersLegacySiteEc2 = new Instance(this, "WanderersLegacySite", {
      vpc: wanderersLegacyVPC,
      vpcSubnets: {
        subnetType: SubnetType.PUBLIC
      },
      instanceType: InstanceType.of(InstanceClass.T2, InstanceSize.MICRO),
      machineImage: new AmazonLinuxImage({
        generation: AmazonLinuxGeneration.AMAZON_LINUX_2,
      }),
      securityGroup: wgSecurityGroup,
      role,
    });
    
    const wgSecrets = Secret.fromSecretNameV2(this, 'WGSecret', 'wanderers-guide-dev')

    creds.grantRead(wanderersLegacySiteEc2)
    wgSecrets.grantRead(wanderersLegacySiteEc2)
    
    wanderersLegacyRDS.grantConnect(wanderersLegacySiteEc2)

    // Retrieve the branch name from the context object
    const branchName = this.node.tryGetContext('branchName') || 'main';

    // Install Node.js and other dependencies on the EC2 instance
    wanderersLegacySiteEc2.addUserData(
      fs.readFileSync(path.join(__dirname, "bootstrap.sh"), "utf-8")
    );
    
    // Clone the app and change directory to the folder
    wanderersLegacySiteEc2.addUserData(`git clone -b ${branchName} https://github.com/wanderers-guide/wanderers-guide.git && cd wanderers-guide/services/express`);
    
    // Add db data
    wanderersLegacySiteEc2.addUserData(
      `export DB_HOST=${wanderersLegacyRDS.dbInstanceEndpointAddress}`,
      `export DB_PORT=${wanderersLegacyRDS.dbInstanceEndpointPort}`,
    )
    
    // Start the app
    wanderersLegacySiteEc2.addUserData("npm install && npm run build && npm run server");

    // Output the EC2 instance public IP
    new CfnOutput(this, "InstancePublicIp", { value: `https://${wanderersLegacySiteEc2.instancePublicIp}` });
    this.url = wanderersLegacySiteEc2.instancePublicIp;
  }
}
